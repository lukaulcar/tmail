import { Plus } from "lucide-react";
import { SectionHeading } from "./SectionHeading";

const FAQ_ITEMS = [
  {
    question: "What is a temporary email address?",
    answer:
      "A temporary, or disposable, email address is a short-lived inbox you can use instead of your real one. tmail generates a random address for you automatically, delivers anything it receives into a live inbox, and deletes it all after 24 hours.",
  },
  {
    question: "Is tmail really free?",
    answer:
      "Yes. tmail is completely free, with no paid tier, no account and no credit card. You can start a new inbox whenever you need one — each address simply has a short cooldown before it can be swapped for another.",
  },
  {
    question: "How long does an inbox last?",
    answer:
      "Every address and every message it receives is kept for 24 hours from the moment it is created, then permanently deleted. Nothing is stored beyond that window.",
  },
  {
    question: "Do I need to create an account?",
    answer:
      "No. There is nothing to register and no password to remember. A private access token stored in your browser links you back to the same inbox until it expires.",
  },
  {
    question: "Can I send email from a tmail address?",
    answer:
      "Not at the moment. tmail is receive-only by design, which keeps it simple and resistant to abuse. It is built for receiving verification links, confirmation codes, downloads and newsletters.",
  },
  {
    question: "Can I change my temporary address?",
    answer:
      "Yes. Choose Change to swap your current address for a brand-new one. A short cooldown — 15 minutes by default — applies between changes so the service stays fair for everyone.",
  },
  {
    question: "Is it safe to use for important accounts?",
    answer:
      "Use tmail for newsletters, downloads and one-off signups. Because an inbox is not protected by a password, avoid it for banking, work or any account you intend to keep — anyone holding your access token can read the inbox.",
  },
  {
    question: "What happens to my data?",
    answer:
      "Nothing beyond delivering your mail. There is no advertising, no third-party analytics and no profiling. Addresses and messages are deleted automatically within 24 hours.",
  },
  {
    question: "Does tmail work on mobile?",
    answer:
      "Yes. The interface is fully responsive and works in any modern browser on phones, tablets and desktops, with the same real-time inbox updates.",
  },
];

export function Faq() {
  return (
    <section
      id="faq"
      className="scroll-mt-24 border-t border-neutral-200/70 bg-neutral-50/50 py-20"
    >
      <div className="mx-auto max-w-5xl px-5 sm:px-6">
        <SectionHeading
          eyebrow="FAQ"
          title="Frequently asked questions"
        >
          Everything you might want to know about temporary email, disposable
          addresses and how tmail handles your data.
        </SectionHeading>

        <div className="mt-12 grid gap-x-12 gap-y-0 lg:grid-cols-2">
          {[FAQ_ITEMS.slice(0, 5), FAQ_ITEMS.slice(5)].map((column, index) => (
            <div key={index} className="border-t border-neutral-200">
              {column.map((item) => (
                <details
                  key={item.question}
                  className="group border-b border-neutral-200"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-4 py-5 text-left text-[15px] font-medium text-ink transition-colors hover:text-neutral-500">
                    {item.question}
                    <Plus
                      className="h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-200 group-open:rotate-45"
                      aria-hidden="true"
                    />
                  </summary>
                  <div className="pb-5 pr-8 text-sm leading-relaxed text-neutral-500">
                    {item.answer}
                  </div>
                </details>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
