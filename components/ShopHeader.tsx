import { Store } from "lucide-react";
import type { Profile, SellerRating, SupportingColor } from "@/types";
import { FILL, SHOP_TINT } from "@/lib/colors";
import { RatingStarsFor } from "@/components/RatingStars";

type MiniProfile = Pick<Profile, "handle" | "displayName" | "avatarColor" | "avatarImageUrl">;

/**
 * Seller identity block, shared by the Marketplace card and the public profile
 * storefront so the same shop reads "recognizably the same" in both places.
 *
 * Two of the three card fallback states live here (the third — no photo → color
 * block — is a card-level concern):
 *   - shopName set  → full storefront header: banner-tinted square avatar, shop
 *                     name in display type, tagline, a storefront glyph.
 *   - no shopName   → individual seller: round avatar + display name (no tint).
 * Rating (display-only) sits condensed on the right in both.
 */
export default function ShopHeader({
  profile,
  shopName,
  shopTagline,
  bannerColor,
  rating,
  size = "card",
}: {
  profile: MiniProfile;
  shopName?: string | null;
  shopTagline?: string | null;
  bannerColor?: SupportingColor | null;
  rating?: SellerRating;
  size?: "card" | "profile";
}) {
  const name = profile.displayName?.trim() || `@${profile.handle}`;
  const initial = (profile.displayName?.trim() || profile.handle)[0]?.toUpperCase() ?? "?";
  const isStorefront = !!shopName?.trim();
  const color = (bannerColor ?? profile.avatarColor) as SupportingColor;
  const avatarDim = size === "profile" ? "h-14 w-14" : "h-10 w-10";
  const nameCls =
    size === "profile" ? "font-display text-card-title text-ink" : "font-display text-body font-bold text-ink";

  // avatar: uploaded photo if present, else a tinted square (storefront) or a
  // solid round initial tile (individual).
  const avatar = profile.avatarImageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage public URL
    <img
      src={profile.avatarImageUrl}
      alt=""
      className={`${avatarDim} shrink-0 border-2 border-ink object-cover ${
        isStorefront ? "rounded-chip" : "rounded-full"
      }`}
    />
  ) : isStorefront ? (
    <span
      className={`flex ${avatarDim} shrink-0 items-center justify-center rounded-chip border-2 font-display text-lg font-extrabold text-ink ${SHOP_TINT[color]}`}
    >
      {initial}
    </span>
  ) : (
    <span
      className={`flex ${avatarDim} shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${FILL[color]}`}
    >
      {initial}
    </span>
  );

  return (
    <span className="flex items-center gap-2.5">
      {avatar}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1">
          {isStorefront && <Store size={14} className="shrink-0 text-text-secondary" aria-hidden />}
          <span className={`block truncate ${nameCls}`}>{isStorefront ? shopName : name}</span>
        </span>
        {isStorefront && shopTagline?.trim() ? (
          <span className="block truncate text-meta text-text-secondary">{shopTagline}</span>
        ) : (
          <RatingStarsFor rating={rating} />
        )}
      </span>
      {isStorefront && rating && rating.count > 0 && (
        <span className="shrink-0">
          <RatingStarsFor rating={rating} />
        </span>
      )}
    </span>
  );
}
