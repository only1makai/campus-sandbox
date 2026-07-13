import { Sparkles } from "lucide-react";
import type { Profile, SellerRating, ShopIdentity } from "@/types";
import { SHOP_TINT } from "@/lib/colors";
import ShopHeader from "@/components/ShopHeader";

type MiniProfile = Pick<Profile, "handle" | "displayName" | "avatarColor" | "avatarImageUrl">;

/**
 * Public storefront block — the profile's Selling section when the seller has a
 * shop_name. Same ShopHeader as the card so the shop reads "recognizably the
 * same." Unset fields simply don't render (no placeholders); the caller only
 * mounts this when shopName is set (else the plain Selling list renders).
 */
export default function StorefrontProfileBlock({
  profile,
  identity,
  rating,
  salesCount,
  children,
}: {
  profile: MiniProfile;
  identity: ShopIdentity;
  rating?: SellerRating;
  salesCount: number;
  children: React.ReactNode;
}) {
  const color = identity.shopBannerColor ?? "gold";

  return (
    <div className="mt-6 overflow-hidden rounded-card border-2 border-ink shadow-resting">
      {/* hero image, or a banner-color tint band when unset */}
      {identity.shopHeroUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage public URL
        <img src={identity.shopHeroUrl} alt="" className="aspect-[3/1] w-full object-cover" />
      ) : (
        <div className={`h-16 w-full border-b-2 ${SHOP_TINT[color]}`} />
      )}

      <div className="flex flex-col gap-3 bg-card p-4 sm:p-5">
        <ShopHeader
          profile={profile}
          shopName={identity.shopName}
          shopTagline={identity.shopTagline}
          bannerColor={identity.shopBannerColor}
          rating={rating}
          size="profile"
        />

        {/* badges: custom orders + sales count (each only when it applies) */}
        {(identity.acceptsCustom || salesCount > 0) && (
          <div className="flex flex-wrap items-center gap-2">
            {identity.acceptsCustom && (
              <span className="flex items-center gap-1 rounded-full border-2 border-ink bg-live-green px-2.5 py-0.5 text-meta font-semibold text-white">
                <Sparkles size={12} /> Accepting custom orders
              </span>
            )}
            {salesCount > 0 && (
              <span className="rounded-full border-2 border-ink bg-cream px-2.5 py-0.5 text-meta font-semibold text-ink">
                {salesCount} {salesCount === 1 ? "sale" : "sales"}
              </span>
            )}
          </div>
        )}

        {/* specialty tags */}
        {identity.specialtyTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {identity.specialtyTags.map((t) => (
              <span key={t} className="rounded-full border border-ink bg-cream px-2.5 py-0.5 text-meta font-semibold text-ink">
                {t}
              </span>
            ))}
          </div>
        )}

        {/* shop story */}
        {identity.shopStory?.trim() && (
          <p className="whitespace-pre-wrap text-body text-ink">{identity.shopStory}</p>
        )}

        <div className="mt-1">{children}</div>
      </div>
    </div>
  );
}
