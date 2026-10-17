import { useState, type SyntheticEvent } from "react";
import { Check, ChevronDown, Copy, Trash, X } from "lucide-react";
import type { Message } from "../types";
import { cn } from "../lib/cn";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  formatBytes,
  formatFullDate,
  formatListDate,
  initialsFor,
  parseAddress,
  toSnippet,
} from "../lib/format";

const ACTION_BUTTON_CLASS =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[11px] font-medium text-neutral-600 transition hover:border-neutral-300 hover:bg-neutral-50 hover:text-ink active:scale-[0.96]";

function buildFrameDocument(html: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><base target="_blank"><style>
:root{color-scheme:light}
html,body{margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#0a0a0a;font-size:14px;line-height:1.65;padding:24px 26px;overflow-wrap:anywhere;word-break:break-word}
*{max-width:100%}
img,video,canvas,svg{max-width:100%;height:auto}
table{max-width:100%;border-collapse:collapse}
a{color:#0a0a0a;text-decoration:underline}
blockquote{margin:0 0 0 1rem;padding-left:1rem;border-left:2px solid #e4e4e7;color:#52525b}
pre{white-space:pre-wrap}
</style></head><body>${html}</body></html>`;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-baseline gap-3">
      <dt className="w-11 shrink-0 font-mono text-[10px] font-medium tracking-[0.12em] text-neutral-400 uppercase">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 break-words text-[13px] leading-snug text-neutral-700">
        {value || "—"}
      </dd>
    </div>
  );
}

interface MessageRowProps {
  message: Message;
  expanded: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onCopyBody: (message: Message) => Promise<void>;
}

export function MessageRow({
  message,
  expanded,
  onToggle,
  onDelete,
  onCopyBody,
}: MessageRowProps) {
  const [frameHeight, setFrameHeight] = useState(120);
  const [copiedBody, setCopiedBody] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const sender = parseAddress(message.sender);
  const unread = !message.is_read;
  const preview = toSnippet(message.body) || "No text preview available";
  const fromDisplay =
    sender.name === sender.email ? sender.email : `${sender.name} <${sender.email}>`;

  const handleFrameLoad = (event: SyntheticEvent<HTMLIFrameElement>) => {
    let doc: Document | null = null;
    try {
      doc = event.currentTarget.contentDocument;
    } catch {
      doc = null;
    }
    if (!doc) return;

    const measure = () => {
      const height = Math.max(
        doc.documentElement?.scrollHeight ?? 0,
        doc.body?.scrollHeight ?? 0
      );
      if (height > 0) {
        setFrameHeight(Math.min(Math.max(height + 8, 72), 1400));
      }
    };

    measure();
    window.setTimeout(measure, 400);
  };

  const handleCopyBody = async () => {
    await onCopyBody(message);
    setCopiedBody(true);
    window.setTimeout(() => setCopiedBody(false), 1600);
  };

  return (
    <li className={cn("group/row transition-colors", unread && "bg-neutral-50/50")}>
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => onToggle(message.id)}
          aria-expanded={expanded}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-neutral-50 active:bg-neutral-100",
            expanded && "bg-neutral-50/80"
          )}
        >
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border font-mono text-[11px] font-semibold",
              unread
                ? "border-ink bg-ink text-white"
                : "border-neutral-200 bg-white text-neutral-500"
            )}
            aria-hidden="true"
          >
            {initialsFor(sender)}
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex items-baseline justify-between gap-3">
              <span
                className={cn(
                  "truncate text-sm",
                  unread ? "font-semibold text-ink" : "font-medium text-neutral-700"
                )}
              >
                {sender.name}
              </span>
              <span className="shrink-0 font-mono text-[11px] tabular-nums text-neutral-400">
                {formatListDate(message.date)}
              </span>
            </span>
            <span
              className={cn(
                "mt-0.5 block truncate text-[13px]",
                unread ? "font-medium text-neutral-900" : "text-neutral-600"
              )}
            >
              {message.subject || "(no subject)"}
            </span>
            {!expanded && (
              <span className="mt-0.5 block truncate text-xs text-neutral-400">
                {preview}
              </span>
            )}
          </span>

          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-neutral-300 transition-transform duration-200",
              expanded && "rotate-180"
            )}
            aria-hidden="true"
          />
        </button>
      </div>

      {expanded && (
        <div className="animate-fade-in border-t border-neutral-100 bg-neutral-50/70 px-5 py-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <dl className="grid min-w-0 flex-1 gap-x-8 gap-y-2">
              <Field label="From" value={fromDisplay} />
              <Field label="To" value={message.recipient} />
              <Field label="Date" value={formatFullDate(message.date)} />
              <Field label="Size" value={formatBytes(message.size_bytes)} />
            </dl>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleCopyBody()}
                className={ACTION_BUTTON_CLASS}
              >
                {copiedBody ? (
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {copiedBody ? "Copied" : "Copy text"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className={ACTION_BUTTON_CLASS}
              >
                <Trash className="h-3.5 w-3.5" aria-hidden="true" />
                Delete
              </button>
              <button
                type="button"
                onClick={() => onToggle(message.id)}
                title="Close message"
                aria-label="Close message"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-neutral-800 active:scale-[0.96]"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Close
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            {message.body_html ? (
              <iframe
                title={`Message from ${sender.name}`}
                srcDoc={buildFrameDocument(message.body_html)}
                sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                referrerPolicy="no-referrer"
                onLoad={handleFrameLoad}
                style={{ height: `${frameHeight}px` }}
                className="message-frame w-full border-0"
              />
            ) : (
              <pre className="max-h-[520px] overflow-auto p-6 font-mono text-xs leading-relaxed whitespace-pre-wrap text-ink sm:p-7 sm:text-[13px]">
                {message.body || "No text content."}
              </pre>
            )}
          </div>

          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => onToggle(message.id)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium text-neutral-500 transition hover:bg-neutral-100 hover:text-ink active:scale-[0.96]"
            >
              <ChevronDown className="h-3.5 w-3.5 rotate-180" aria-hidden="true" />
              Close message
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete this message?"
        description={`"${message.subject || "(no subject)"}" will be permanently removed from your inbox. This can't be undone.`}
        confirmLabel="Delete message"
        onConfirm={() => {
          setConfirmingDelete(false);
          onDelete(message.id);
        }}
        onCancel={() => setConfirmingDelete(false)}
      />
    </li>
  );
}
