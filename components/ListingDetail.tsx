import Link from "next/link";
import { MapPin, Smartphone, Globe } from "lucide-react";
import type { ListingDetailData } from "@/lib/detail";
import type { SupportingColor } from "@/types";
import DetailGallery from "@/components/DetailGallery";
import ShopHeader from "@/components/ShopHeader";
import SellerBadge from "@/components/SellerBadge";
import ConditionBadge from "@/components/ConditionBadge";
import RequestButton from "@/components/RequestButton";
import MarkSoldButton from "@/components/MarkSoldButton";
import TesterActions from "@/components/TesterActions";

/**
 * The universal detail shell — one content layout for all three post types,
 * shared by the intercepted overlay and the bare page. Content order is
 * identical across types: image → title + price/status → full (uncapped)
 * description → maker/seller block linking to the profile → one primary action.
 * Demo posts are viewable but their actions stay disabled/relabeled.
 */
export default function ListingDetail({ data }: { data: ListingDetailData }) {
  const { post, currentUserId, rating, joined } = data;
  const isOwn = !!currentUserId && currentUserId === post.author.id;
  const images = post.type === "app" ? [] : post.imageUrls ?? [];
  const bannerColor = (("bannerColor" in post && post.bannerColor) || "gold") as SupportingColor;

  return (
    <div className="flex flex-col">
      <DetailGallery images={images} bannerColor={bannerColor} title={post.title} letter={post.title[0] ?? "?"} />

      <div className="flex flex-col gap-4 p-5 sm:p-6">
        {/* title + price/status */}
        <div className="flex items-start justify-between gap-3">
          <h1 className="min-w-0 font-display text-heading text-ink">{post.title}</h1>
          {post.type !== "app" && (
            <span className="shrink-0 rounded-chip border-2 border-ink bg-card px-3 py-1 font-display text-card-title text-ink shadow-resting">
              ${(post.priceCents / 100).toFixed(post.priceCents % 100 ? 2 : 0)}
            </span>
          )}
        </div>

        {/* meta row */}
        <div className="flex flex-wrap items-center gap-2 text-meta text-text-secondary">
          {post.type === "app" ? (
            <>
              <span className="flex items-center gap-1 rounded-full border border-ink bg-card px-2.5 py-0.5 text-ink">
                {post.platform === "ios" ? <Smartphone size={12} /> : <Globe size={12} />}
                {post.platform === "ios" ? "iOS" : "Web"}
              </span>
              {post.statusLabel && (
                <span className="rounded-full bg-cream px-2.5 py-0.5 font-semibold text-ink">{post.statusLabel}</span>
              )}
            </>
          ) : (
            <>
              <span className="rounded-full border border-ink bg-cream px-2.5 py-0.5 font-semibold uppercase tracking-wide text-ink">
                {post.category}
              </span>
              {post.type === "thrift" && <ConditionBadge condition={post.condition} />}
              {post.type === "thrift" && post.status === "sold" && (
                <span className="rounded-full bg-ink px-2.5 py-0.5 font-semibold text-paper">Sold</span>
              )}
              <span className="flex items-center gap-1">
                <MapPin size={13} /> {post.locationLabel}
              </span>
            </>
          )}
        </div>

        {/* full, uncapped description */}
        <p className="whitespace-pre-wrap text-body text-ink">{post.description}</p>

        <hr className="border-border-soft" />

        {/* maker / seller block → profile */}
        <div className="flex items-center justify-between gap-3">
          <Link href={`/u/${post.author.handle}`} className="min-w-0 rounded-btn hover:opacity-80">
            {post.type === "shop" ? (
              <ShopHeader
                profile={post.author}
                shopName={post.shopName}
                shopTagline={post.shopTagline}
                bannerColor={post.shopBannerColor}
                rating={rating}
                size="profile"
              />
            ) : (
              <SellerBadge profile={post.author} rating={rating} size="md" />
            )}
          </Link>
          {post.type === "shop" && (
            <Link
              href={`/u/${post.author.handle}`}
              className="shrink-0 text-meta font-semibold text-link-blue hover:underline"
            >
              View shop →
            </Link>
          )}
        </div>

        {/* one primary action */}
        <div>{renderAction()}</div>
      </div>
    </div>
  );

  function renderAction() {
    if (post.type === "app") {
      if (post.isDemo) return actionNote("Example app");
      if (isOwn)
        return (
          <a
            href={post.ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center rounded-btn border-2 border-ink bg-gold px-4 py-2.5 font-sans text-body font-semibold text-ink shadow-resting transition-shadow hover:shadow-elevated hover:bg-gold-hover"
          >
            {post.ctaLabel}
          </a>
        );
      const capFull = post.maxTesters != null && post.testerCount >= post.maxTesters;
      return (
        <TesterActions
          postId={post.id}
          ctaUrl={post.ctaUrl}
          ctaLabel={post.ctaLabel}
          initialJoined={joined}
          full={capFull}
        />
      );
    }

    // shop / thrift
    if (post.isDemo) return actionNote("Example listing");
    if (post.type === "thrift" && post.status === "sold") return actionNote("No longer available");
    if (isOwn && post.type === "thrift") return <MarkSoldButton postId={post.id} />;
    if (isOwn && post.type === "shop") return actionNote("Your listing");
    return <RequestButton postId={post.id} />;
  }

  function actionNote(label: string) {
    return (
      <p className="rounded-btn border-2 border-dashed border-text-faint bg-paper px-4 py-2.5 text-center text-meta font-semibold text-text-secondary">
        {label}
      </p>
    );
  }
}
