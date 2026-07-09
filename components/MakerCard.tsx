"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, MapPin, MessageSquarePlus } from "lucide-react";
import type { MarketPost, SellerRating } from "@/types";
import { reviewPost } from "@/app/actions/karma";
import BoostBadge from "@/components/BoostBadge";
import RequestButton from "@/components/RequestButton";
import MarkSoldButton from "@/components/MarkSoldButton";
import SellerBadge from "@/components/SellerBadge";
import { RatingStarsFor } from "@/components/RatingStars";
import { FILL } from "@/lib/colors";
import { hoverLift, tapPress, transitionBase, transitionFast } from "@/lib/motion";

/** Covers both shop (in_stock/made_to_order/sold_out) and thrift
 *  (available/sold/expired) statuses — the two share this card shape. */
const STATUS_PILL: Record<string, string> = {
  in_stock: "bg-live-green text-white",
  made_to_order: "bg-gold text-ink",
  sold_out: "bg-ink text-paper",
  available: "bg-live-green text-white",
  sold: "bg-ink text-paper",
  expired: "bg-border-soft text-text-secondary",
};

const CATEGORY_EMOJI: Record<string, string> = {
  flowers: "🌼",
  ceramics: "☕",
  stickers: "🍌",
  journals: "📓",
  candles: "🕯️",
  fiber: "🧶",
};

/** Masonry variety: photo block heights cycle by index. */
const PHOTO_HEIGHTS = ["h-44", "h-60", "h-52", "h-64", "h-48", "h-56"];

/** Thrift "time remaining" — coarse (days, then hours) to stay hydration-stable. */
function timeLeft(expiresAt?: string | null): string | null {
  if (!expiresAt) return null;
  const ms = Date.parse(expiresAt) - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return null;
  const days = Math.floor(ms / 86_400_000);
  if (days >= 1) return `${days} day${days === 1 ? "" : "s"} left`;
  const hours = Math.max(1, Math.floor(ms / 3_600_000));
  return `${hours} hour${hours === 1 ? "" : "s"} left`;
}

function daysUntil(expiresAt?: string | null): number | null {
  if (!expiresAt) return null;
  const ms = Date.parse(expiresAt) - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return null;
  return Math.floor(ms / 86_400_000);
}

export default function MakerCard({
  product,
  index,
  isAuthed,
  readOnly = false,
  rating,
  currentUserId,
}: {
  product: MarketPost;
  index: number;
  isAuthed: boolean;
  /** Landing preview: strip every action (request/review/mark-sold). */
  readOnly?: boolean;
  /** Seller star aggregate — display fact, never ranking. Shown on shop AND
   *  thrift cards (seller-level credibility; thrift order stays newest-first). */
  rating?: SellerRating;
  /** Viewer id — to detect the seller's own listing. */
  currentUserId?: string;
}) {
  const router = useRouter();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [body, setBody] = useState("");
  const [reviewCount, setReviewCount] = useState(
    product.type === "shop" ? product.reviewCount : 0,
  );
  const [reviewed, setReviewed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stickerKey, setStickerKey] = useState(0);
  const [busy, startTransition] = useTransition();

  const isThrift = product.type === "thrift";
  const isSold = isThrift && product.status === "sold";
  const isOwn = !!currentUserId && currentUserId === product.author.id;
  const remaining = isThrift && !isSold ? timeLeft(product.expiresAt) : null;
  const daysLeft = isThrift && !isSold ? daysUntil(product.expiresAt) : null;
  const urgent = daysLeft !== null && daysLeft <= 2;
  const price = `$${(product.priceCents / 100).toFixed(product.priceCents % 100 ? 2 : 0)}`;

  // Review is shop-only, write-gated, never on your own shop or in preview.
  const showReview = product.type === "shop" && !readOnly && !isOwn;

  const openReview = () => {
    if (!isAuthed) {
      router.push("/login");
      return;
    }
    setReviewOpen((open) => !open);
    setError(null);
  };

  const submitReview = () => {
    setError(null);
    startTransition(async () => {
      const result = await reviewPost(product.id, body);
      if (!result.ok) {
        if (result.reason === "auth_required") router.push("/login");
        else setError(result.message ?? "Something went wrong.");
        return;
      }
      setReviewed(true);
      setReviewOpen(false);
      setReviewCount((c) => c + 1);
      setStickerKey((k) => k + 1);
      console.log(`[karma] +15 · review_received · post=${product.id} (verified)`);
    });
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hoverLift}
      transition={transitionBase}
      className={`mb-8 break-inside-avoid overflow-hidden rounded-card border-2 border-ink bg-card shadow-resting transition-shadow duration-150 hover:shadow-elevated ${
        isSold ? "opacity-75" : ""
      }`}
    >
      {/* photo block — flat color, big category mark, price tag sticker */}
      <div
        className={`relative flex items-center justify-center ${PHOTO_HEIGHTS[index % PHOTO_HEIGHTS.length]} ${FILL[product.bannerColor]}`}
      >
        <span
          className={`text-6xl ${isSold ? "opacity-40" : ""}`}
          role="img"
          aria-label={product.category}
        >
          {CATEGORY_EMOJI[product.category] ?? "🛠️"}
        </span>

        {/* sold: dim + stamp */}
        {isSold && (
          <span className="absolute inset-0 flex items-center justify-center bg-ink/25">
            <span className="-rotate-6 rounded-chip border-2 border-ink bg-card px-4 py-1 font-display text-heading font-extrabold uppercase tracking-wide text-ink shadow-resting">
              Sold
            </span>
          </span>
        )}

        <span
          className={`absolute left-3 top-3 rounded-full px-3 py-1 font-sans text-meta ${STATUS_PILL[product.status] ?? "bg-card text-ink"}`}
        >
          {product.statusLabel}
        </span>

        {/* thrift leads with time remaining; ≤2 days reads urgent (tomato) */}
        {remaining && (
          <span
            className={`absolute right-3 top-3 flex items-center gap-1 rounded-full border border-ink px-2.5 py-1 font-sans text-meta font-semibold ${
              urgent ? "bg-tomato text-white" : "bg-card text-ink"
            }`}
          >
            <Clock size={12} />
            {remaining}
          </span>
        )}

        <span className="absolute -right-1 bottom-4 rounded-chip border-2 border-ink bg-card px-3 py-1 font-display text-card-title text-ink shadow-resting">
          {price}
        </span>
        {product.type === "shop" && (
          <BoostBadge post={product} placement="absolute bottom-4 left-3" />
        )}
      </div>

      <div className="flex flex-col gap-2 p-4">
        <h3 className="font-display text-card-title text-ink">{product.title}</h3>

        {/* seller credibility: star rating (display only, never ranking) */}
        <RatingStarsFor rating={rating} />

        <p className="text-body text-text-secondary">{product.description}</p>

        <div className="flex items-center justify-between">
          <SellerBadge profile={product.author} />
          <span className="flex items-center gap-1 text-meta text-text-faint">
            <MapPin size={13} />
            {product.locationLabel}
          </span>
        </div>

        {/* primary action — request / owner / sold (hidden in read-only preview) */}
        {!readOnly &&
          (isSold ? (
            <p className="mt-2 text-center text-meta font-semibold text-text-faint">
              No longer available
            </p>
          ) : isOwn ? (
            isThrift ? (
              <MarkSoldButton postId={product.id} />
            ) : (
              <p className="mt-2 text-center text-meta text-text-faint">Your listing</p>
            )
          ) : (
            <RequestButton postId={product.id} />
          ))}

        {/* review = the verified-karma action (shop only, secondary) */}
        {showReview && (
          <div className="relative mt-1">
            <motion.button
              type="button"
              onClick={openReview}
              disabled={reviewed}
              whileTap={tapPress}
              transition={transitionFast}
              className={`flex w-full items-center justify-center gap-1.5 rounded-btn border-2 border-ink px-3 py-2 font-sans text-meta font-semibold text-ink shadow-resting transition-shadow hover:shadow-elevated ${
                reviewed ? "bg-live-green text-white" : "bg-cream hover:bg-paper"
              }`}
            >
              <MessageSquarePlus size={15} />
              {reviewed
                ? "Reviewed — thanks, slug!"
                : `Review this maker${reviewCount ? ` · ${reviewCount}` : ""}`}
            </motion.button>

            <AnimatePresence>
              {stickerKey > 0 && (
                <motion.span
                  key={stickerKey}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: [0, 1, 1, 0], y: -30 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  onAnimationComplete={() => setStickerKey(0)}
                  className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-chip border-2 border-ink bg-gold px-2 py-0.5 font-display text-[11px] font-extrabold text-ink shadow-resting"
                >
                  +15 karma
                </motion.span>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {reviewOpen && !reviewed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={transitionBase}
                  className="overflow-hidden"
                >
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={2}
                    maxLength={280}
                    placeholder="Short and honest — how was the pickup, the goods, the vibe?"
                    className="mt-1 w-full rounded-btn border-2 border-ink bg-cream p-2 text-body text-ink placeholder:text-text-faint focus:bg-card focus:outline-none"
                  />
                  {error && (
                    <p className="mt-1 rounded-chip border-2 border-ink bg-tomato px-2 py-1 text-meta font-semibold text-white">
                      {error}
                    </p>
                  )}
                  <motion.button
                    type="button"
                    onClick={submitReview}
                    disabled={busy || body.trim().length < 3}
                    whileTap={tapPress}
                    transition={transitionFast}
                    className="mt-2 w-full rounded-btn border-2 border-ink bg-gold px-3 py-2 font-sans text-meta font-semibold text-ink shadow-resting transition-shadow hover:shadow-elevated hover:bg-gold-hover active:bg-gold-active disabled:opacity-60"
                  >
                    {busy ? "Posting…" : "Post review (+15 to the maker)"}
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.article>
  );
}
