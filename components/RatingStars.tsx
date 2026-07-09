import { Star } from "lucide-react";
import type { SellerRating } from "@/types";

/**
 * Seller star rating — DISPLAY ONLY, never feeds ranking/ordering anywhere
 * (COMMERCE.md guardrail). Renders nothing until at least one rating exists.
 * Extracted from the inline block that lived in MakerCard.
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
  const filled = Math.round(avg ?? 0);

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            size={size}
            className={n <= filled ? "text-gold" : "text-border-soft"}
            fill={n <= filled ? "currentColor" : "none"}
          />
        ))}
      </div>
      <span className="text-meta font-semibold text-ink">{avg?.toFixed(1)}</span>
      <span className="text-meta text-text-faint">({count})</span>
    </div>
  );
}

/** Convenience: render from a SellerRating aggregate. */
export function RatingStarsFor({ rating, size }: { rating?: SellerRating; size?: number }) {
  if (!rating) return null;
  return <RatingStars avg={rating.avg} count={rating.count} size={size} />;
}
