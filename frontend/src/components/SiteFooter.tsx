import { Logo } from "./Logo";

const PRODUCT_LINKS = [
  { href: "#inbox", label: "Live inbox" },
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#faq", label: "FAQ" },
];

const CURRENT_YEAR = new Date().getFullYear();

export function SiteFooter() {
  return (
    <footer className="border-t border-neutral-200/70 bg-white">
      <div className="mx-auto max-w-5xl px-5 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-neutral-500">
              A free, disposable email service with a real-time inbox. Receive
              mail without giving away your real address — everything expires
              automatically after 24 hours.
            </p>
          </div>

          <nav aria-label="Footer">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-400">
              Product
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm text-neutral-500">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="transition-colors hover:text-ink"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-400">
              Service
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm text-neutral-500">
              <li>24-hour retention</li>
              <li>Receive-only by design</li>
              <li>
                <a
                  href="https://mailer.lukaulcar.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-ink"
                >
                  Mailer API
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-neutral-100 pt-6 font-mono text-[11px] text-neutral-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {CURRENT_YEAR} tmail. All rights reserved.</p>
          <p>
            Built by Luka Ulcar · Powered by{" "}
            <a
              href="https://mailer.lukaulcar.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-500 transition-colors hover:text-ink"
            >
              mailer.lukaulcar.com
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
