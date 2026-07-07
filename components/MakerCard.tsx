"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, MessageSquarePlus } from "lucide-react";
import type { ProductPost, SupportingColor } from "@/types";
import { reviewPost } from "@/app/actions/karma";
import BoostBadge from "@/components/BoostBadge";

const INK = "#262014";
const SPRING = [0.34, 1.56, 0.64, 1] as const;

const FILL: Record<SupportingColor, string> = {
  gold: "bg-gold",
  "live-green": "bg-live-green",
  "link-blue": "bg-link-blue",
  tomato: "bg-tomato",
  grape: "bg-grape",
};

const STATUS_PILL: Record<ProductPost["status"], string> = {
  in_stock: "bg-live-green text-white",
  made_to_order: "bg-gold text-ink",
  sold_out: "bg-ink text-paper",
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
const TILTS = [1.5, -1.8, 1.1, -1.3, 2, -1.5];

export default function MakerCard({
  product,
  index,
  isAuthed,
}: {
  product: ProductPost;
  index: number;
  isAuthed: boolean;
}) {
  const router = useRouter();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [body, setBody] = useState("");
  const [reviewCount, setReviewCount] = useState(product.reviewCount);
  const [reviewed, setReviewed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stickerKey, setStickerKey] = useState(0);
  const [busy, startTransition] = useTransition();

  const tilt = TILTS[index % TILTS.length];
  const price = `$${(product.priceCents / 100).toFixed(product.priceCents % 100 ? 2 : 0)}`;

  const openReview = () => {
    // Reviewing writes — requires a signed-in slug (browsing stays public).
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
      initial={{ opacity: 0, y: 16, rotate: tilt }}
      animate={{ opacity: 1, y: 0, rotate: tilt }}
      whileHover={{ y: -2, rotate: 0, boxShadow: `6px 6px 0 ${INK}` }}
      transition={{ duration: 0.2, ease: SPRING }}
      style={{ boxShadow: `4px 4px 0 ${INK}` }}
      className="mb-8 break-inside-avoid overflow-hidden rounded-card border-2 border-ink bg-card"
    >
      {/* photo block — flat color, big category mark, price tag sticker */}
      <div
        className={`relative flex items-center justify-center ${PHOTO_HEIGHTS[index % PHOTO_HEIGHTS.length]} ${FILL[product.bannerColor]}`}
      >
        <span className="text-6xl" role="img" aria-label={product.category}>
          {CATEGORY_EMOJI[product.category] ?? "🛠️"}
        </span>

        <span
          className={`absolute left-3 top-3 rounded-full px-3 py-1 font-sans text-meta ${STATUS_PILL[product.status]}`}
        >
          {product.statusLabel}
        </span>

        <span className="absolute -right-1 bottom-4 rotate-[-4deg] rounded-chip border-2 border-ink bg-card px-3 py-1 font-display text-card-title text-ink shadow-[2px_2px_0_#262014]">
          {price}
        </span>
        <BoostBadge post={product} placement="absolute bottom-4 left-3" />
      </div>

      <div className="flex flex-col gap-2 p-4">
        <h3 className="font-display text-card-title text-ink">{product.title}</h3>
        <p className="text-body text-text-secondary">{product.description}</p>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white ${FILL[product.author.avatarColor]}`}
            >
              {product.author.handle[0].toUpperCase()}
            </span>
            <span className="text-meta text-text-secondary">@{product.author.handle}</span>
          </span>
          <span className="flex items-center gap-1 text-meta text-text-faint">
            <MapPin size={13} />
            {product.locationLabel}
          </span>
        </div>

        {/* review = the verified-karma action */}
        <div className="relative mt-2">
          <motion.button
            type="button"
            onClick={openReview}
            disabled={reviewed}
            whileTap={{ y: 2, boxShadow: `1px 1px 0 ${INK}` }}
            transition={{ duration: 0.16, ease: SPRING }}
            style={{ boxShadow: `3px 3px 0 ${INK}` }}
            className={`flex w-full items-center justify-center gap-1.5 rounded-btn border-2 border-ink px-3 py-2 font-sans text-meta font-semibold text-ink ${
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
                initial={{ opacity: 0, y: 4, rotate: -8, scale: 0.8 }}
                animate={{ opacity: [0, 1, 1, 0], y: -34, rotate: [-8, 6, -3], scale: 1 }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                onAnimationComplete={() => setStickerKey(0)}
                className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-chip border-2 border-ink bg-gold px-2 py-0.5 font-display text-[11px] font-extrabold text-ink shadow-[2px_2px_0_#262014]"
              >
                +15 karma
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {reviewOpen && !reviewed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: SPRING }}
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
                whileTap={{ y: 2, boxShadow: `1px 1px 0 ${INK}` }}
                style={{ boxShadow: `3px 3px 0 ${INK}` }}
                className="mt-2 w-full rounded-btn border-2 border-ink bg-gold px-3 py-2 font-sans text-meta font-semibold text-ink hover:bg-gold-hover active:bg-gold-active disabled:opacity-60"
              >
                {busy ? "Posting…" : "Post review (+15 to the maker)"}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  );
}
