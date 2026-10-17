import { Check, CircleAlert, Copy, LoaderCircle, RefreshCw } from "lucide-react";
import type { MailboxController } from "../hooks/useMailbox";
import { cn } from "../lib/cn";
import { formatCountdown, formatExpiry } from "../lib/format";
import { StatusDot } from "./StatusDot";

export function MailboxPanel({ state }: { state: MailboxController }) {
  const {
    mailbox,
    loading,
    copied,
    refreshing,
    cooldownRemaining,
    expiresIn,
    wsConnected,
    error,
    canChangeAddress,
    copyAddress,
    changeAddress,
  } = state;

  const cooldownLabel = formatCountdown(cooldownRemaining);
  const cooldownTotal = mailbox
    ? Math.max(1, mailbox.next_refresh_at - mailbox.last_refreshed_at)
    : 1;
  const cooldownProgress =
    cooldownRemaining > 0
      ? Math.min(100, Math.max(0, ((cooldownTotal - cooldownRemaining) / cooldownTotal) * 100))
      : 100;

  return (
    <div id="inbox" className="scroll-mt-24">
      <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(9,9,11,0.04),0_28px_60px_-36px_rgba(9,9,11,0.35)]">
        <div className="flex items-center justify-between gap-3 border-b border-neutral-100 bg-neutral-50/70 px-5 py-2.5">
          <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-400">
            <StatusDot active={wsConnected} />
            {wsConnected ? "Inbox live" : "Connecting"}
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-400 tabular-nums">
            {expiresIn > 0
              ? `Expires in ${formatExpiry(mailbox?.expires_at ?? 0)}`
              : "24h lifetime"}
          </span>
        </div>

        <div className="px-5 py-7 sm:px-8 sm:py-9">
          {loading ? (
            <div className="flex flex-col items-center gap-5">
              <div className="skeleton h-3 w-40 rounded-full" />
              <div className="skeleton h-7 w-72 max-w-full rounded-full" />
              <div className="flex gap-2">
                <div className="skeleton h-11 w-36 rounded-xl" />
                <div className="skeleton h-11 w-28 rounded-xl" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-400">
                Your temporary address
              </p>

              <button
                type="button"
                onClick={() => void copyAddress()}
                title="Copy address"
                className="group mt-3 flex max-w-full items-center justify-center gap-2.5 rounded-xl px-2 py-1"
              >
                <span className="truncate font-mono text-xl font-medium tracking-tight text-ink select-all sm:text-3xl">
                  {mailbox?.address ?? "—"}
                </span>
                <Copy
                  className="h-5 w-5 shrink-0 text-neutral-300 transition-colors group-hover:text-ink"
                  aria-hidden="true"
                />
                <span className="sr-only">Copy address to clipboard</span>
              </button>

              <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => void copyAddress()}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-ink px-5 text-xs font-medium text-white transition hover:bg-neutral-800 active:scale-[0.97]"
                >
                  {copied ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  )}
                  {copied ? "Copied" : "Copy address"}
                </button>

                <button
                  type="button"
                  onClick={() => void changeAddress()}
                  disabled={!canChangeAddress}
                  title={
                    canChangeAddress
                      ? "Generate a new address"
                      : `New address available in ${cooldownLabel}`
                  }
                  className={cn(
                    "inline-flex h-11 items-center gap-2 rounded-xl border px-5 text-xs font-medium transition",
                    canChangeAddress
                      ? "border-neutral-200 bg-white text-ink hover:border-neutral-300 hover:bg-neutral-50 active:scale-[0.97]"
                      : "cursor-not-allowed border-neutral-100 bg-neutral-50 text-neutral-400"
                  )}
                >
                  {refreshing ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  )}
                  {cooldownRemaining > 0 ? cooldownLabel : "Change address"}
                </button>
              </div>

              {cooldownRemaining > 0 && (
                <div className="mt-6 w-full max-w-sm">
                  <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full rounded-full bg-ink/80 transition-[width] duration-1000 ease-linear"
                      style={{ width: `${cooldownProgress}%` }}
                    />
                  </div>
                  <p className="mt-2 font-mono text-[11px] text-neutral-400">
                    A new address is available in {cooldownLabel}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div
            role="status"
            className="flex animate-fade-in items-start gap-2 border-t border-neutral-100 bg-neutral-50 px-5 py-3 text-xs text-neutral-600"
          >
            <CircleAlert className="mt-px h-4 w-4 shrink-0 text-ink" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
