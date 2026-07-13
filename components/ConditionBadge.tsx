import { asCondition, CONDITION_DOT } from "@/lib/conditions";

/**
 * Thrift condition pill — a colored dot + tier label. Lives in the card BODY,
 * never on the photo (must not compete with the time-left chip or SOLD stamp).
 * Null/unknown condition renders nothing (no placeholder) — legacy thrift rows
 * and shop posts simply don't show it.
 */
export default function ConditionBadge({ condition }: { condition?: string | null }) {
  const c = asCondition(condition);
  if (!c) return null;
  return (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-ink bg-cream px-2 py-0.5 text-[11px] font-semibold text-ink">
      <span className={`h-2 w-2 rounded-full ${CONDITION_DOT[c]}`} aria-hidden />
      {c}
    </span>
  );
}
