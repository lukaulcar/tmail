import { SectionHeading } from "./SectionHeading";

const STEPS = [
  {
    title: "An inbox is ready",
    body: "Open tmail and a random address is generated for you automatically — no forms, no signup, nothing to configure.",
  },
  {
    title: "Use it anywhere",
    body: "Paste the address into any signup form, download gate, trial or newsletter box that you don't fully trust with your real email.",
  },
  {
    title: "Watch mail arrive live",
    body: "Incoming messages appear in your inbox in real time. Read them, copy verification codes, then let everything expire on its own.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-24 border-t border-neutral-200/70 py-20"
    >
      <div className="mx-auto max-w-5xl px-5 sm:px-6">
        <SectionHeading
          eyebrow="How it works"
          title="Three steps to a clean inbox"
        >
          Temporary email should be effortless. Getting set up takes less time
          than typing your real address.
        </SectionHeading>

        <ol className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white font-mono text-xs font-medium text-ink shadow-xs">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="h-px flex-1 bg-neutral-200" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-[15px] font-semibold text-ink">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
