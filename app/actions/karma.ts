"use server";

import { supabaseServer } from "@/lib/supabase/server";

/**
 * Karma write paths — append-only rows in karma_ledger. Runs on the acting
 * user's session: the SQL functions derive actor_id from auth.uid() and are
 * executable by authenticated users only (anon gets permission denied).
 * user_id stays the karma recipient (post author).
 *
 * GUARDRAIL: karma never affects feed ordering (upvotes/recency only).
 */

export type KarmaResult =
  | { ok: true; upvotes?: number }
  | { ok: false; reason: "auth_required" | "error"; message?: string };

export async function upvotePost(postId: string): Promise<KarmaResult> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "auth_required" };

  const { data, error } = await supabase.rpc("record_upvote", { p_post_id: postId });
  if (error) return { ok: false, reason: "error", message: error.message };
  console.log(`[karma] +1 · upvote_received · post=${postId} · actor=${user.id} · persisted`);
  return { ok: true, upvotes: data };
}

/**
 * Reviews — the first VERIFIED karma path. Writes a review row + a
 * verified=true +15 ledger row to the maker, atomically (record_review).
 * Self-review and duplicate reviews are rejected inside the function.
 */
export async function reviewPost(postId: string, body: string): Promise<KarmaResult> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "auth_required" };

  const trimmed = body.trim();
  if (trimmed.length < 3 || trimmed.length > 280) {
    return { ok: false, reason: "error", message: "Reviews are 3–280 characters." };
  }

  const { error } = await supabase.rpc("record_review", {
    p_post_id: postId,
    p_body: trimmed,
  });
  if (error) {
    const message = error.message.includes("reviews_post_id_author_key")
      ? "You already reviewed this maker."
      : error.message.includes("own shop")
        ? "You can't review your own shop."
        : error.message;
    return { ok: false, reason: "error", message };
  }
  console.log(
    `[karma] +15 · review_received · post=${postId} · actor=${user.id} · verified · persisted`,
  );
  return { ok: true };
}

export async function recordCtaClick(postId: string): Promise<KarmaResult> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // CTA stays public — browsing logged-out just doesn't record karma.
  if (!user) return { ok: false, reason: "auth_required" };

  const { error } = await supabase.rpc("record_cta_click", { p_post_id: postId });
  if (error) return { ok: false, reason: "error", message: error.message };
  console.log(`[karma] +5 · cta_click · post=${postId} · actor=${user.id} · persisted`);
  return { ok: true };
}
