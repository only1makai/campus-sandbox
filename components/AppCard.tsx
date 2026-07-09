"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowBigUp, Smartphone, Globe } from "lucide-react";
import type { AppPost, SupportingColor } from "@/types";
import { logKarma } from "@/lib/karma";
import { recordCtaClick, upvotePost } from "@/app/actions/karma";
import BoostBadge from "@/components/BoostBadge";
import { hoverLift, tapPress, transitionBase, transitionFast } from "@/lib/motion";

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

export default function AppCard({
  app,
  isAuthed,
  readOnly = false,
}: {
  app: AppPost;
  isAuthed: boolean;
  /** Landing preview: strip all interactive affordances (no upvote, no CTA link). */
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [upvoted, setUpvoted] = useState(false);
  const [count, setCount] = useState(app.upvotes);
  const [stickerKey, setStickerKey] = useState(0);

  const betaFull = app.status === "beta_full";

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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      whileHover={hoverLift}
      transition={{ ...transitionBase, layout: transitionBase }}
      className={`flex flex-col overflow-hidden rounded-card border-2 shadow-resting transition-shadow duration-150 hover:shadow-elevated ${
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
          className={`flex h-16 w-16 items-center justify-center rounded-chip border-2 border-ink bg-card font-display text-4xl font-extrabold shadow-resting ${
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
        {readOnly ? (
          <div className="mt-3 flex items-stretch gap-2">
            <span
              className={`flex flex-1 items-center justify-center rounded-btn border-2 px-4 py-2 text-center font-sans text-meta font-semibold shadow-resting ${
                betaFull
                  ? "border-dashed border-text-faint bg-paper text-text-secondary"
                  : "border-ink bg-gold text-ink"
              }`}
            >
              {betaFull ? "Beta full — join waitlist" : app.ctaLabel}
            </span>
            <div className="flex items-center gap-1.5 rounded-btn border-2 border-ink bg-card px-3 py-2 font-sans text-meta font-semibold text-ink shadow-resting">
              <ArrowBigUp size={16} />
              {count}
            </div>
          </div>
        ) : (
        <div className="mt-3 flex items-stretch gap-2">
          <motion.a
            href={app.ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleCta}
            whileTap={tapPress}
            transition={transitionFast}
            className={`flex flex-1 items-center justify-center rounded-btn border-2 px-4 py-2 text-center font-sans text-meta font-semibold shadow-resting transition-shadow hover:shadow-elevated ${
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
              whileTap={tapPress}
              transition={transitionFast}
              className={`flex items-center gap-1.5 rounded-btn border-2 border-ink px-3 py-2 font-sans text-meta font-semibold text-ink shadow-resting transition-shadow hover:shadow-elevated ${
                upvoted ? "bg-gold" : "bg-card hover:bg-cream"
              }`}
            >
              <ArrowBigUp size={16} fill={upvoted ? "#262014" : "none"} />
              <motion.span
                key={count}
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.06, 1] }}
                transition={transitionFast}
              >
                {count}
              </motion.span>
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
                  +1 karma
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
        )}
      </div>
    </motion.article>
  );
}
