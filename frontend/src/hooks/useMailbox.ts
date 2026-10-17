import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  WS_BASE_URL,
  deleteMessage,
  fetchMailbox,
  fetchMessage,
  fetchMessages,
  refreshMailbox,
} from "../api";
import type { Mailbox, Message, WSMessageEvent } from "../types";

const TOKEN_STORAGE_KEY = "tmail.token";
const RECONNECT_DELAY_MS = 3000;
const RETRY_DELAY_MS = 5000;
const ERROR_TIMEOUT_MS = 6000;
const MIN_SPIN_MS = 600;
const COPY_FEEDBACK_MS = 2000;

function copyViaTextarea(text: string): boolean {
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.top = "-1000px";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

async function writeToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    const ok = await navigator.clipboard.writeText(text).then(
      () => true,
      () => false
    );
    if (ok) return true;
  }
  return copyViaTextarea(text);
}

export function useMailbox() {
  const [mailbox, setMailbox] = useState<Mailbox | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [expiresIn, setExpiresIn] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expiryHandled = useRef(false);

  const showError = useCallback((message: string) => {
    setError(message);
    if (errorTimer.current) clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setError(null), ERROR_TIMEOUT_MS);
  }, []);

  const applyMailbox = useCallback(async (mb: Mailbox) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, mb.token);
    setMailbox(mb);
    setMessages(await fetchMessages(mb.token));
  }, []);

  const loadMailbox = useCallback(
    async function attemptLoad() {
      const address = new URLSearchParams(window.location.search).get("address");

      try {
        const token = address ? null : localStorage.getItem(TOKEN_STORAGE_KEY);
        await applyMailbox(await fetchMailbox(token, address));
      } catch {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        try {
          await applyMailbox(await fetchMailbox(null, null));
        } catch {
          showError("Can't reach the mail server — retrying in a few seconds.");
          if (retryTimer.current) clearTimeout(retryTimer.current);
          retryTimer.current = setTimeout(() => void attemptLoad(), RETRY_DELAY_MS);
        }
      } finally {
        setLoading(false);
      }
    },
    [applyMailbox, showError]
  );

  useEffect(() => {
    const bootstrap = async () => {
      await loadMailbox();
    };
    void bootstrap();
  }, [loadMailbox]);

  useEffect(() => {
    expiryHandled.current = false;
  }, [mailbox]);

  useEffect(() => {
    const tick = () => {
      if (!mailbox) return;
      const now = Math.floor(Date.now() / 1000);
      setCooldownRemaining(Math.max(0, mailbox.next_refresh_at - now));
      setExpiresIn(Math.max(0, mailbox.expires_at - now));
      if (now >= mailbox.expires_at && !expiryHandled.current) {
        expiryHandled.current = true;
        void loadMailbox();
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [mailbox, loadMailbox]);

  useEffect(() => {
    const token = mailbox?.token;
    if (!token) return;

    let socket: WebSocket | null = null;
    let reconnect: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      socket = new WebSocket(`${WS_BASE_URL}/api/ws?token=${token}`);

      socket.onopen = () => setWsConnected(true);

      socket.onmessage = (event) => {
        let data: WSMessageEvent;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }
        if (data.type === "new_message" && data.message) {
          setMessages((prev) =>
            prev.some((m) => m.id === data.message.id) ? prev : [data.message, ...prev]
          );
        }
      };

      socket.onclose = () => {
        setWsConnected(false);
        if (!disposed) reconnect = setTimeout(connect, RECONNECT_DELAY_MS);
      };

      socket.onerror = () => socket?.close();
    };

    connect();

    return () => {
      disposed = true;
      if (reconnect) clearTimeout(reconnect);
      socket?.close();
    };
  }, [mailbox?.token]);

  useEffect(
    () => () => {
      if (errorTimer.current) clearTimeout(errorTimer.current);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      if (retryTimer.current) clearTimeout(retryTimer.current);
    },
    []
  );

  const copyAddress = useCallback(async () => {
    if (!mailbox) return;
    if (!(await writeToClipboard(mailbox.address))) {
      showError("Copy failed — select the address and copy it manually.");
      return;
    }
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
  }, [mailbox, showError]);

  const changeAddress = useCallback(async () => {
    if (!mailbox || refreshing || cooldownRemaining > 0) return;
    setRefreshing(true);
    try {
      const updated = await refreshMailbox(mailbox.token);
      setExpandedId(null);
      await applyMailbox(updated);
    } catch (err) {
      showError(
        err instanceof Error && err.message
          ? err.message
          : "Couldn't change the address. Please try again."
      );
    } finally {
      setRefreshing(false);
    }
  }, [mailbox, refreshing, cooldownRemaining, applyMailbox, showError]);

  const reloadMessages = useCallback(async () => {
    if (!mailbox || reloading) return;
    const startedAt = Date.now();
    setReloading(true);
    try {
      setMessages(await fetchMessages(mailbox.token));
    } catch {
      showError("Couldn't refresh the inbox.");
    } finally {
      const remaining = Math.max(0, MIN_SPIN_MS - (Date.now() - startedAt));
      window.setTimeout(() => setReloading(false), remaining);
    }
  }, [mailbox, reloading, showError]);

  const removeMessage = useCallback(
    async (id: string) => {
      if (!mailbox) return;
      if (!(await deleteMessage(id, mailbox.token))) {
        showError("Couldn't delete that message.");
        return;
      }
      setMessages((prev) => prev.filter((m) => m.id !== id));
      setExpandedId((prev) => (prev === id ? null : prev));
    },
    [mailbox, showError]
  );

  const toggleExpand = useCallback(
    (id: string) => {
      setExpandedId((prev) => (prev === id ? null : id));

      const target = messages.find((m) => m.id === id);
      if (!target || target.is_read) return;

      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, is_read: true } : m)));
      if (mailbox) void fetchMessage(id, mailbox.token).catch(() => {});
    },
    [messages, mailbox]
  );

  const copyMessageBody = useCallback(
    async (message: Message) => {
      if (!(await writeToClipboard(message.body || ""))) {
        showError("Copy failed — select the text and copy it manually.");
      }
    },
    [showError]
  );

  const unreadCount = useMemo(
    () => messages.reduce((total, m) => total + (m.is_read ? 0 : 1), 0),
    [messages]
  );

  return {
    mailbox,
    messages,
    expandedId,
    loading,
    refreshing,
    reloading,
    wsConnected,
    copied,
    cooldownRemaining,
    expiresIn,
    error,
    unreadCount,
    canChangeAddress: cooldownRemaining <= 0 && !refreshing,
    copyAddress,
    changeAddress,
    reloadMessages,
    removeMessage,
    toggleExpand,
    copyMessageBody,
  };
}

export type MailboxController = ReturnType<typeof useMailbox>;
