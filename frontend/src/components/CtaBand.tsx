import { ArrowRight } from "lucide-react";

export function CtaBand() {
  return (
    <section className="bg-ink py-20 text-white">
      <div className="mx-auto max-w-5xl px-5 text-center sm:px-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-500">
          Get started
        </p>
        <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Stop handing out your real email address.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-pretty text-neutral-400">
          Spin up a disposable inbox in a single click and keep your personal
          address out of every form, trial and newsletter you never asked for.
        </p>
        <a
          href="#inbox"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-medium text-ink transition hover:bg-neutral-200 active:scale-[0.97]"
        >
          Open a fresh inbox
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-500">
          Free forever · 24-hour expiry · No signup
        </p>
      </div>
    </section>
  );
}
