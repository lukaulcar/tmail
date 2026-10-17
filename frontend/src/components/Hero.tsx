import { ChevronDown } from "lucide-react";
import type { MailboxController } from "../hooks/useMailbox";
import { InboxPanel } from "./InboxPanel";
import { MailboxPanel } from "./MailboxPanel";
import { StatusDot } from "./StatusDot";

export function Hero({ state }: { state: MailboxController }) {
  return (
    <section className="relative isolate flex min-h-[calc(100svh-4rem)] flex-col overflow-hidden">
      <div
        className="dot-grid pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_70%_55%_at_50%_0%,black,transparent)]"
        aria-hidden="true"
      />

      <div className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-5 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500 shadow-xs">
            <StatusDot active />
            Live inbox · No signup
          </span>

          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance text-ink sm:text-5xl md:text-[3.25rem] md:leading-[1.06]">
            Free temporary email,
            <span className="block text-neutral-400">
              delivered in real time.
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-pretty text-neutral-500 sm:text-lg">
            A disposable inbox the moment you open this page. Mail lands
            instantly over a live connection and everything is deleted
            automatically after 24 hours.
          </p>
        </div>

        <div className="mx-auto mt-8 w-full max-w-4xl sm:mt-10">
          <MailboxPanel state={state} />
          <InboxPanel state={state} />
        </div>
      </div>

      <div className="relative flex justify-center pb-5" aria-hidden="true">
        <span className="flex flex-col items-center gap-1 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400">
          Scroll for more
          <ChevronDown className="h-3.5 w-3.5" />
        </span>
      </div>
    </section>
  );
}
