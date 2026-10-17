import type { ReactNode } from "react";

export function SectionHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="max-w-2xl">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-400">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance text-ink sm:text-4xl">
        {title}
      </h2>
      {children && (
        <p className="mt-4 text-[15px] leading-relaxed text-pretty text-neutral-500">
          {children}
        </p>
      )}
    </div>
  );
}
