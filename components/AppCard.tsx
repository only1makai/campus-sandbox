"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowBigUp, Smartphone, Globe } from "lucide-react";
import type { AppPost, SupportingColor } from "@/types";
import { logKarma } from "@/lib/karma";
import { recordCtaClick, upvotePost } from "@/app/actions/karma";
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

const LETTER: Record<SupportingColor, string> = {
  gold: "text-gold",
  "live-green": "text-live-green",
  "link-blue": "text-link-blue",
  tomato: "text-tomato",
  grape: "text-grape",
};

const STATUS_PILL: Record<AppPost["status"], string> = {
  shipped_weekend: "bg-live-green text-white",
  needs_testers: "bg-gold text-ink",
  beta_full: "bg-ink text-paper",
  live: "bg-card text-ink",
};

/** Alternating slight tilt — every card gets one, that's the brand. */
const TILTS = [-2, 1.5, -1.2, 2, -1.6, 1.2];

export default function AppCard({
  app,
  index,
  isAuthed,
}: {
  app: AppPost;
  index: number;
  isAuthed: boolean;
}) {
  const router = useRouter();
  const [upvoted, setUpvoted] = useState(false);
  const [count, setCount] = useState(app.upvotes);
  const [stickerKey, setStickerKey] = useState(0);

  const betaFull = app.status === "beta_full";
  const tilt = TILTS[index % TILTS.length];

  const handleUpvote = () => {
    // Upvoting writes — requires a signed-in slug (browsing stays public).
    if (!isAuthed) {
      router.push("/login");
      return;
    }
    if (upvoted) return;
    setUpvoted(true);
    setCount((c) => c + 1);
    setStickerKey((k) => k + 1);
    logKarma("upvote_received", app.id, 1);
    // Persist: +1 upvote + append-only karma_ledger row (never affects ordering).
    upvotePost(app.id).then((result) => {
      if (!result.ok) {
        setUpvoted(false);
        setCount((c) => c - 1);
        if (result.reason === "auth_required") router.push("/login");
        else console.error("[karma] upvote persist failed:", result.message);
      }
    });
  };

  const handleCta = () => {
    logKarma("cta_click", app.id, 5);
    // Logged-out clicks still open the app — they just don't record karma.
    recordCtaClick(app.id).then((result) => {
      if (!result.ok && result.reason === "error")
        console.error("[karma] cta persist failed:", result.message);
    });
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16, rotate: tilt }}
      animate={{ opacity: 1, y: 0, rotate: tilt }}
      exit={{ opacity: 0, scale: 0.92 }}
      whileHover={{
        y: -2,
        rotate: 0,
        boxShadow: betaFull ? `4px 4px 0 ${INK}` : `6px 6px 0 ${INK}`,
      }}
      transition={{ duration: 0.2, ease: SPRING, layout: { duration: 0.24, ease: SPRING } }}
      style={{ boxShadow: `4px 4px 0 ${INK}` }}
      className={`flex flex-col overflow-hidden rounded-card border-2 ${
        betaFull ? "border-dashed border-text-faint bg-paper" : "border-ink bg-card"
      }`}
    >
      {/* banner — flat color block, never a gradient */}
      <div
        className={`relative flex h-32 items-center justify-center ${
          betaFull ? "bg-border-soft" : FILL[app.bannerColor]
        }`}
      >
        <span
          className={`flex h-16 w-16 rotate-[-3deg] items-center justify-center rounded-chip border-2 border-ink bg-card font-display text-4xl font-extrabold shadow-[2px_2px_0_#262014] ${
            LETTER[app.bannerColor]
          }`}
        >
          {app.title[0]}
        </span>

        <span
          className={`absolute left-3 top-3 rounded-full px-3 py-1 font-sans text-meta ${STATUS_PILL[app.status]}`}
        >
          {app.statusLabel}
        </span>

        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full border border-ink bg-card px-2.5 py-1 font-sans text-meta text-ink">
          {app.platform === "ios" ? <Smartphone size={12} /> : <Globe size={12} />}
          {app.platform === "ios" ? "iOS" : "Web"}
        </span>

        <BoostBadge post={app} />
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-display text-card-title text-ink">{app.title}</h3>
        <p className="truncate text-body text-text-secondary">{app.description}</p>

        <div className="mt-1 flex items-center gap-2">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white ${
              FILL[app.author.avatarColor]
            }`}
          >
            {app.author.handle[0].toUpperCase()}
          </span>
          <span className="text-meta text-text-secondary">@{app.author.handle}</span>
        </div>

        {/* footer */}
        <div className="mt-3 flex items-stretch gap-2">
          <motion.a
            href={app.ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleCta}
            whileTap={{ y: 2, boxShadow: `1px 1px 0 ${INK}` }}
            transition={{ duration: 0.16, ease: SPRING }}
            style={{ boxShadow: `3px 3px 0 ${INK}` }}
            className={`flex flex-1 items-center justify-center rounded-btn border-2 px-4 py-2 text-center font-sans text-meta font-semibold ${
              betaFull
                ? "border-dashed border-text-faint bg-paper text-text-secondary"
                : "border-ink bg-gold text-ink hover:bg-gold-hover active:bg-gold-active"
            }`}
          >
            {betaFull ? "Beta full — join waitlist" : app.ctaLabel}
          </motion.a>

          <div className="relative">
            <motion.button
              type="button"
              onClick={handleUpvote}
              aria-pressed={upvoted}
              whileTap={{ y: 2, boxShadow: `1px 1px 0 ${INK}` }}
              transition={{ duration: 0.16, ease: SPRING }}
              style={{ boxShadow: `3px 3px 0 ${INK}` }}
              className={`flex items-center gap-1.5 rounded-btn border-2 border-ink px-3 py-2 font-sans text-meta font-semibold text-ink ${
                upvoted ? "bg-gold" : "bg-card hover:bg-cream"
              }`}
            >
              <ArrowBigUp size={16} fill={upvoted ? INK : "none"} />
              <motion.span
                key={count}
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ duration: 0.24, ease: SPRING }}
              >
                {count}
              </motion.span>
            </motion.button>

            <AnimatePresence>
              {stickerKey > 0 && (
                <motion.span
                  key={stickerKey}
                  initial={{ opacity: 0, y: 4, rotate: -8, scale: 0.8 }}
                  animate={{
                    opacity: [0, 1, 1, 0],
                    y: -34,
                    rotate: [-8, 6, -3],
                    scale: 1,
                  }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                  onAnimationComplete={() => setStickerKey(0)}
                  className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-chip border-2 border-ink bg-gold px-2 py-0.5 font-display text-[11px] font-extrabold text-ink shadow-[2px_2px_0_#262014]"
                >
                  +1 karma
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
