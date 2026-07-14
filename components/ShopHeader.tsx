import { Store } from "lucide-react";
import type { Profile, SellerRating, SupportingColor } from "@/types";
import { FILL, SHOP_TINT } from "@/lib/colors";
import { RatingStarsFor } from "@/components/RatingStars";

type MiniProfile = Pick<Profile, "handle" | "displayName" | "avatarColor" | "avatarImageUrl">;

/**
 * Seller identity block, shared by the Marketplace card, the detail view, and
 * (via StorefrontProfileBlock) the public profile — so the same shop reads
 * "recognizably the same" everywhere.
 *
 * Storefront fallbacks:
 *   - shopName + shopHeroUrl → hero image as the background behind the identity
 *     (avatar/name/tagline), with a scrim for legibility.
 *   - shopName, no hero       → flat identity row (banner-tinted square avatar).
 *   - no shopName             → individual seller: round avatar + display name.
 * The listing's own photo (card image / detail gallery) is separate and
 * unaffected by the hero here.
 */
export default function ShopHeader({
  profile,
  shopName,
  shopTagline,
  bannerColor,
  heroUrl,
  rating,
  size = "card",
}: {
  profile: MiniProfile;
  shopName?: string | null;
  shopTagline?: string | null;
  bannerColor?: SupportingColor | null;
  heroUrl?: string | null;
  rating?: SellerRating;
  size?: "card" | "profile";
}) {
  const name = profile.displayName?.trim() || `@${profile.handle}`;
  const initial = (profile.displayName?.trim() || profile.handle)[0]?.toUpperCase() ?? "?";
  const isStorefront = !!shopName?.trim();
  const hasHero = isStorefront && !!heroUrl;
  const color = (bannerColor ?? profile.avatarColor) as SupportingColor;
  const avatarDim = size === "profile" ? "h-14 w-14" : "h-10 w-10";
  const nameCls =
    size === "profile" ? "font-display text-card-title" : "font-display text-body font-bold";

  // text/glyph colors flip to light over a hero (dark scrim), else ink.
  const textMain = hasHero ? "text-white" : "text-ink";
  const textSub = hasHero ? "text-white/85" : "text-text-secondary";
  const glyphCls = hasHero ? "text-white/90" : "text-text-secondary";

  // avatar: uploaded photo → image; else storefront → tinted (or solid over a
  // hero) square with initial; else individual → solid round initial tile.
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
      className={`flex ${avatarDim} shrink-0 items-center justify-center rounded-chip border-2 border-ink font-display text-lg font-extrabold text-ink ${
        hasHero ? "bg-card" : SHOP_TINT[color]
      }`}
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

  const content = (
    <span className={`relative flex items-center gap-2.5 ${hasHero ? "p-2.5" : ""}`}>
      {avatar}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1">
          {isStorefront && <Store size={14} className={`shrink-0 ${glyphCls}`} aria-hidden />}
          <span className={`block truncate ${nameCls} ${textMain}`}>
            {isStorefront ? shopName : name}
          </span>
        </span>
        {isStorefront && shopTagline?.trim() ? (
          <span className={`block truncate text-meta ${textSub}`}>{shopTagline}</span>
        ) : (
          <RatingStarsFor rating={rating} />
        )}
      </span>
      {isStorefront && rating && rating.count > 0 && (
        <span className={`shrink-0 ${hasHero ? "rounded-full bg-card px-2 py-0.5" : ""}`}>
          <RatingStarsFor rating={rating} />
        </span>
      )}
    </span>
  );

  if (!hasHero) return content;

  return (
    <span className="relative block overflow-hidden rounded-chip border-2 border-ink">
      {/* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage public URL */}
      <img src={heroUrl!} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <span className="absolute inset-0 bg-ink/45" aria-hidden />
      {content}
    </span>
  );
}
