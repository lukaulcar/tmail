import { useEffect, useState } from "react";
import { cn } from "../lib/cn";
import { GitHubMark } from "./GitHubMark";
import { Logo } from "./Logo";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#faq", label: "FAQ" },
];

export function SiteHeader() {
  const [condensed, setCondensed] = useState(false);

  useEffect(() => {
    const onScroll = () => setCondensed(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50">
      <div
        className={cn(
          "mx-auto flex items-center justify-between gap-4 transition-[max-width,height,margin,padding,border-radius,background-color,border-color,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
          condensed
            ? "mt-3 mb-1 h-12 max-w-2xl rounded-full border border-neutral-200/80 bg-white/85 px-3 shadow-[0_10px_34px_-16px_rgba(9,9,11,0.35)] backdrop-blur-xl sm:px-4"
            : "h-16 max-w-5xl border border-transparent bg-transparent px-5 sm:px-6"
        )}
      >
        <a href="#top" className="shrink-0 rounded-lg" aria-label="tmail home">
          <Logo />
        </a>

        <nav
          className="hidden items-center gap-8 text-sm text-neutral-500 md:flex"
          aria-label="Main"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <a
            href="https://github.com/lukaulcar/tmail"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View tmail on GitHub"
            title="View tmail on GitHub"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-500 shadow-xs transition hover:border-neutral-300 hover:text-ink active:scale-[0.97]"
          >
            <GitHubMark className="h-[17px] w-[17px]" />
          </a>
          <a
            href="#inbox"
            className="inline-flex items-center rounded-lg bg-ink px-3.5 py-2 text-xs font-medium text-white transition hover:bg-neutral-800 active:scale-[0.97]"
          >
            Get inbox
          </a>
        </div>
      </div>
    </header>
  );
}
