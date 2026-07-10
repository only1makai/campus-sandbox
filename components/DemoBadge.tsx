/**
 * "Example" chip for seeded demo posts. Reuses BoostBadge's sticker-chip recipe
 * with a neutral card fill — no new tokens. Position it via `className`.
 */
export default function DemoBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`rounded-chip border-2 border-ink bg-card px-2 py-0.5 font-display text-[11px] font-extrabold uppercase tracking-wide text-ink shadow-resting ${className}`}
    >
      Example
    </span>
  );
}
