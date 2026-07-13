/**
 * Thrift item-condition scale (Session 16). Shared by the /sell ConditionSelect
 * and the card/detail ConditionBadge so the vocabulary + dot colors stay in one
 * place. The allowlist mirrors create_post / the posts.condition CHECK exactly.
 *
 * Dot colors are a warm best→worn ramp built from existing design tokens (no new
 * color token). Visual detail — adjust to the mockup if it disagrees.
 */
export const CONDITIONS = ["New", "Like new", "Good", "Used", "Well-loved"] as const;
export type Condition = (typeof CONDITIONS)[number];

export const CONDITION_DOT: Record<Condition, string> = {
  New: "bg-live-green",
  "Like new": "bg-gold",
  Good: "bg-gold-active",
  Used: "bg-tomato",
  "Well-loved": "bg-text-faint",
};

/** Narrow an arbitrary string to a known condition (else null → no badge). */
export function asCondition(value: string | null | undefined): Condition | null {
  return value && (CONDITIONS as readonly string[]).includes(value) ? (value as Condition) : null;
}
