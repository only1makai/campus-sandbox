"use client";

import type { AppPost, ProductPost } from "@/types";

/**
 * BOOSTED sticker — renders only while a post's verified-karma boost window
 * is live (derived from boost/boostExpiresAt, never the stale bool), and
 * disappears on its own when the window expires.
 */
export default function BoostBadge({
  post,
  placement = "absolute bottom-3 right-3",
}: {
  post: AppPost | ProductPost;
  placement?: string;
}) {
  const expiresAt = post.boostExpiresAt ? Date.parse(post.boostExpiresAt) : null;
  const active = (post.boost ?? 0) > 0 && expiresAt !== null && expiresAt > Date.now();
  if (!active) return null;

  const daysLeft = Math.max(1, Math.ceil((expiresAt - Date.now()) / 86_400_000));

  return (
    <span
      className={`${placement} rounded-chip border-2 border-ink bg-gold px-2 py-0.5 font-display text-[11px] font-extrabold tracking-wide text-ink shadow-resting`}
    >
      BOOSTED · {daysLeft}d left
    </span>
  );
}
