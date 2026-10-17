export function StatusDot({ active }: { active: boolean }) {
  return (
    <span className="relative flex h-2 w-2" aria-hidden="true">
      {active && (
        <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-ink" />
      )}
      <span
        className={`relative inline-flex h-2 w-2 rounded-full ${
          active ? "bg-ink" : "bg-neutral-300"
        }`}
      />
    </span>
  );
}
