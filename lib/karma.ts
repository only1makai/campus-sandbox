import type { KarmaAction } from "@/types";

/**
 * Stubbed karma handler — Session 2 persists this to karma_ledger.
 *
 * GUARDRAIL: karma is recorded, never fed into feed ranking. Per-click
 * points are trivially farmable, so ordering stays on upvotes/recency
 * until weighting is abuse-resistant.
 */
export function logKarma(action: KarmaAction, sourcePostId: string, points: number) {
  console.log(`[karma] +${points} · ${action} · post=${sourcePostId}`);
}
