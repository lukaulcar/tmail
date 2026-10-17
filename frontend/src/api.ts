import type { Mailbox, Message } from "./types";

const RAW_API_URL = import.meta.env.VITE_API_URL as string | undefined;

const API_BASE_URL = RAW_API_URL
  ? RAW_API_URL.replace(/\/$/, "")
  : window.location.port === "5173" || window.location.port === "3000"
  ? `${window.location.protocol}//${window.location.hostname}:8080`
  : window.location.origin;

export const WS_BASE_URL = API_BASE_URL.replace(/^http:\/\//i, "ws://").replace(/^https:\/\//i, "wss://");

function authHeaders(token?: string | null, json = false): Record<string, string> {
  const headers: Record<string, string> = {};
  if (json) headers["Content-Type"] = "application/json";
  if (token) headers["X-Mailbox-Token"] = token;
  return headers;
}

export async function fetchMailbox(
  token?: string | null,
  address?: string | null
): Promise<Mailbox> {
  const query = address ? `?address=${encodeURIComponent(address)}` : "";
  const res = await fetch(`${API_BASE_URL}/api/mailbox${query}`, {
    method: "POST",
    headers: authHeaders(token, true),
  });

  if (!res.ok) {
    throw new Error("Failed to load mailbox");
  }

  const data = await res.json();
  return data.mailbox;
}

export async function refreshMailbox(token: string): Promise<Mailbox> {
  const res = await fetch(`${API_BASE_URL}/api/mailbox/refresh`, {
    method: "POST",
    headers: authHeaders(token, true),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    if (res.status === 429) {
      throw new Error(`Cooldown active: ${errorData.seconds_remaining ?? 900}s remaining`);
    }
    throw new Error(errorData.error || "Failed to change address");
  }

  const data = await res.json();
  return data.mailbox;
}

export async function fetchMessages(token: string): Promise<Message[]> {
  const res = await fetch(`${API_BASE_URL}/api/mailbox/messages`, {
    headers: authHeaders(token),
  });

  if (!res.ok) {
    throw new Error("Failed to load messages");
  }

  const data = await res.json();
  return data.messages || [];
}

export async function fetchMessage(id: string, token: string): Promise<Message> {
  const res = await fetch(`${API_BASE_URL}/api/mailbox/messages/${id}`, {
    headers: authHeaders(token),
  });

  if (!res.ok) {
    throw new Error("Failed to load message");
  }

  const data = await res.json();
  return data.message;
}

export async function deleteMessage(id: string, token: string): Promise<boolean> {
  const res = await fetch(`${API_BASE_URL}/api/mailbox/messages/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });

  return res.ok;
}
