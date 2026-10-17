import { Lock, Radio, RefreshCw, ShieldCheck, Timer, Zap } from "lucide-react";
import { SectionHeading } from "./SectionHeading";

const FEATURES = [
  {
    icon: Zap,
    title: "Instant inbox, no signup",
    body: "A fresh, unique address is generated the second you load the page. No forms, no confirmation email and no password to remember.",
  },
  {
    icon: Radio,
    title: "Real-time delivery",
    body: "Messages stream into your inbox over a persistent WebSocket connection, so mail appears the moment it reaches the server.",
  },
  {
    icon: Timer,
    title: "Auto-expires in 24 hours",
    body: "Every address and message is permanently deleted after 24 hours. Nothing lingers on our servers longer than it has to.",
  },
  {
    icon: ShieldCheck,
    title: "Safe HTML rendering",
    body: "Rich HTML mail is displayed inside a locked-down sandbox. Images load normally while scripts and forms stay blocked.",
  },
  {
    icon: RefreshCw,
    title: "Swap address anytime",
    body: "Spam starting to creep in? Replace your current address with a brand-new one in a single click after the short cooldown.",
  },
  {
    icon: Lock,
    title: "Private by default",
    body: "No account, no cookies for tracking and no third-party analytics. Your inbox is unlocked only by a private access token.",
  },
];

export function Features() {
  return (
    <section
      id="features"
      className="scroll-mt-24 border-t border-neutral-200/70 bg-neutral-50/50 py-20"
    >
      <div className="mx-auto max-w-5xl px-5 sm:px-6">
        <SectionHeading
          eyebrow="Features"
          title="Everything you need from a throwaway inbox"
        >
          tmail keeps the parts that matter — speed, privacy and a clean inbox —
          and removes everything else. No dashboards, no upsells, no spam.
        </SectionHeading>

        <div className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-200 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-white p-6 sm:p-7">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-ink">
                <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-[15px] font-semibold text-ink">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
