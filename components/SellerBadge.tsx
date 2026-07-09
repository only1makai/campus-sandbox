import type { Profile, SellerRating } from "@/types";
import { FILL } from "@/lib/colors";
import { RatingStarsFor } from "@/components/RatingStars";

/**
 * Seller identity chip: avatar initial + display name, with an optional compact
 * rating line beneath (★ avg (count)). Unifies the person block used on cards,
 * in the request thread, and in the requests list.
 */
export default function SellerBadge({
  profile,
  rating,
  size = "sm",
  bordered = false,
}: {
  profile: Pick<Profile, "handle" | "displayName" | "avatarColor">;
  rating?: SellerRating;
  size?: "sm" | "md";
  bordered?: boolean;
}) {
  const dim = size === "md" ? "h-9 w-9" : "h-8 w-8";
  const name = profile.displayName?.trim() || `@${profile.handle}`;
  const initial = (profile.displayName?.trim() || profile.handle)[0]?.toUpperCase() ?? "?";

  return (
    <span className="flex items-center gap-2">
      <span
        className={`flex ${dim} shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
          bordered ? "border-2 border-ink" : ""
        } ${FILL[profile.avatarColor]}`}
      >
        {initial}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-meta font-bold text-ink">{name}</span>
        <RatingStarsFor rating={rating} />
      </span>
    </span>
  );
}
