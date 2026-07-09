import { Star } from "lucide-react";
import type { SellerRating } from "@/types";

/**
 * Compact seller rating — one gold star + average + count, e.g. "★ 4.9 (38)".
 * DISPLAY ONLY, never feeds ranking/ordering (COMMERCE.md guardrail). Renders
 * nothing until at least one rating exists. (The 5-star interactive picker lives
 * separately in RatingPrompt.)
 */
export default function RatingStars({
  avg,
  count,
  size = 13,
}: {
  avg: number | null;
  count: number;
  size?: number;
}) {
  if (count <= 0) return null;

  return (
    <span className="flex items-center gap-1">
      <Star size={size} className="text-gold" fill="currentColor" aria-hidden />
      <span className="text-meta font-semibold text-ink">{avg?.toFixed(1)}</span>
      <span className="text-meta text-text-faint">({count})</span>
    </span>
  );
}

/** Convenience: render from a SellerRating aggregate. */
export function RatingStarsFor({ rating, size }: { rating?: SellerRating; size?: number }) {
  if (!rating) return null;
  return <RatingStars avg={rating.avg} count={rating.count} size={size} />;
}
