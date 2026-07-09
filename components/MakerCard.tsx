"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, MessageSquarePlus } from "lucide-react";
import type { MarketPost, SellerRating } from "@/types";
import { reviewPost } from "@/app/actions/karma";
import BoostBadge from "@/components/BoostBadge";
import RequestButton from "@/components/RequestButton";
import MarkSoldButton from "@/components/MarkSoldButton";
import SellerBadge from "@/components/SellerBadge";
import { FILL } from "@/lib/colors";
import { hoverLift, tapPress, transitionBase, transitionFast } from "@/lib/motion";

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
  isAuthed,
  readOnly = false,
  rating,
  currentUserId,
}: {
  product: MarketPost;
  /** Kept for call-site compatibility; layout no longer varies by index. */
  index?: number;
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
  const category = (product.category ?? "goods").toUpperCase();

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
      className={`flex flex-row overflow-hidden rounded-card border-2 border-ink bg-card shadow-resting transition-shadow duration-150 hover:shadow-elevated sm:flex-col ${
        isSold ? "opacity-75" : ""
      }`}
    >
      {/* color block — left rail on mobile, top banner on desktop */}
      <div
        className={`relative flex w-28 shrink-0 items-center justify-center p-3 sm:h-32 sm:w-full ${FILL[product.bannerColor]}`}
      >
        <span className="text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/60">
          {category}
        </span>

        {/* sold: dim + stamp */}
        {isSold && (
          <span className="absolute inset-0 flex items-center justify-center bg-ink/25">
            <span className="-rotate-6 rounded-chip border-2 border-ink bg-card px-3 py-1 font-display text-card-title font-extrabold uppercase tracking-wide text-ink shadow-resting">
              Sold
            </span>
          </span>
        )}

        {/* thrift leads with time remaining; ≤2 days reads urgent (tomato) */}
        {remaining && (
          <span
            className={`absolute left-2 top-2 flex items-center gap-1 rounded-full border border-ink px-2 py-0.5 font-sans text-[11px] font-semibold ${
              urgent ? "bg-tomato text-white" : "bg-card text-ink"
            }`}
          >
            <Clock size={11} />
            {remaining}
          </span>
        )}

        <span className="absolute -bottom-2 right-2 rounded-chip border-2 border-ink bg-card px-2.5 py-0.5 font-display text-card-title text-ink shadow-resting sm:bottom-3">
          {price}
        </span>
        {product.type === "shop" && (
          <BoostBadge post={product} placement="absolute bottom-3 left-3" />
        )}
      </div>

      {/* content */}
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <SellerBadge profile={product.author} rating={rating} />

        <h3 className="font-display text-card-title text-ink">{product.title}</h3>

        {/* primary action — request / owner / sold (hidden in read-only preview) */}
        {!readOnly &&
          (isSold ? (
            <p className="mt-1 text-center text-meta font-semibold text-text-faint">
              No longer available
            </p>
          ) : isOwn ? (
            isThrift ? (
              <MarkSoldButton postId={product.id} />
            ) : (
              <p className="mt-1 text-center text-meta text-text-faint">Your listing</p>
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
