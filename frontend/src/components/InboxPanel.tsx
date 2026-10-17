import { Inbox as InboxIcon, MailOpen, RefreshCw } from "lucide-react";
import type { MailboxController } from "../hooks/useMailbox";
import { cn } from "../lib/cn";
import { MessageRow } from "./MessageRow";

function InboxSkeleton() {
  return (
    <ul className="min-h-[18rem] divide-y divide-neutral-100">
      {[0, 1, 2].map((row) => (
        <li key={row} className="flex items-center gap-4 px-5 py-4">
          <span className="skeleton h-9 w-9 shrink-0 rounded-full" />
          <span className="block flex-1 space-y-2">
            <span className="skeleton block h-3 w-1/3 rounded-full" />
            <span className="skeleton block h-3 w-2/3 rounded-full" />
          </span>
        </li>
      ))}
    </ul>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[18rem] flex-col items-center justify-center px-6 py-10 text-center">
      <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-neutral-50">
        <MailOpen className="h-6 w-6 text-neutral-400" aria-hidden="true" />
      </span>
      <p className="text-sm font-medium text-ink">Waiting for incoming mail</p>
      <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-neutral-500">
        Messages sent to your address show up here the instant they arrive. Try
        sending a test email from another inbox.
      </p>
    </div>
  );
}

export function InboxPanel({ state }: { state: MailboxController }) {
  const {
    messages,
    unreadCount,
    loading,
    reloading,
    expandedId,
    toggleExpand,
    removeMessage,
    reloadMessages,
    copyMessageBody,
  } = state;

  return (
    <section aria-labelledby="inbox-heading" className="mt-6">
      <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(9,9,11,0.03)]">
        <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-5 py-3">
          <div className="flex items-center gap-2.5">
            <InboxIcon className="h-4 w-4 text-neutral-400" aria-hidden="true" />
            <h2 id="inbox-heading" className="text-sm font-medium text-ink">
              Inbox
            </h2>
            {messages.length > 0 && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-mono text-[11px] tabular-nums text-neutral-500">
                {messages.length}
              </span>
            )}
            {unreadCount > 0 && (
              <span className="rounded-full border border-neutral-200 px-2 py-0.5 font-mono text-[11px] tabular-nums text-ink">
                {unreadCount} new
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => void reloadMessages()}
            disabled={loading || reloading}
            title="Refresh inbox"
            aria-label="Refresh inbox"
            className="group inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[11px] font-medium text-neutral-600 transition duration-150 hover:border-neutral-300 hover:bg-neutral-50 hover:text-ink active:scale-[0.95] active:bg-neutral-100 disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw
              className={cn(
                "h-3.5 w-3.5 transition-transform duration-200 group-active:rotate-90",
                reloading && "animate-spin"
              )}
              aria-hidden="true"
            />
            {reloading ? "Refreshing" : "Refresh"}
          </button>
        </div>

        {loading ? (
          <InboxSkeleton />
        ) : messages.length === 0 ? (
          <EmptyState />
        ) : (
          <ul
            role="list"
            className="max-h-[32rem] min-h-[18rem] divide-y divide-neutral-100 overflow-y-auto"
          >
            {messages.map((message) => (
              <MessageRow
                key={message.id}
                message={message}
                expanded={expandedId === message.id}
                onToggle={toggleExpand}
                onDelete={(id) => void removeMessage(id)}
                onCopyBody={copyMessageBody}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
