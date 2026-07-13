"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

export type StudioResult =
  | { ok: true }
  | { ok: false; reason: "auth_required" | "error"; message?: string };

async function actor() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Saves the seller's full storefront identity (name/tagline/banner + hero,
 *  specialty tags, custom-orders toggle, shop story). update_shop_profile is
 *  owner-only and re-validates tag count (≤5) and story length (≤400). */
export async function saveShopIdentity(input: {
  shopName: string;
  shopTagline: string;
  shopBannerColor: string;
  shopHeroUrl?: string | null;
  specialtyTags?: string[];
  acceptsCustom?: boolean;
  shopStory?: string;
}): Promise<StudioResult> {
  const { supabase, user } = await actor();
  if (!user) return { ok: false, reason: "auth_required" };
  const tags = (input.specialtyTags ?? [])
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 5);
  const { error } = await supabase.rpc("update_shop_profile", {
    p_shop_name: input.shopName.trim() || null,
    p_shop_tagline: input.shopTagline.trim() || null,
    p_shop_banner_color: input.shopBannerColor || null,
    p_shop_hero_url: input.shopHeroUrl?.trim() || null,
    p_specialty_tags: tags.length ? tags : null,
    p_accepts_custom: input.acceptsCustom ?? false,
    p_shop_story: input.shopStory?.trim() || null,
  });
  if (error) return { ok: false, reason: "error", message: error.message };
  revalidatePath("/studio");
  revalidatePath("/u", "layout");
  return { ok: true };
}

/** Maker replies to a review on their listing (owner-only, enforced in the RPC). */
export async function replyToReview(reviewId: string, reply: string): Promise<StudioResult> {
  const { supabase, user } = await actor();
  if (!user) return { ok: false, reason: "auth_required" };
  const trimmed = reply.trim();
  if (trimmed.length < 1 || trimmed.length > 500) {
    return { ok: false, reason: "error", message: "Reply must be 1–500 characters." };
  }
  const { error } = await supabase.rpc("reply_to_review", {
    p_review_id: reviewId,
    p_reply: trimmed,
  });
  if (error) {
    const msg = error.message.toLowerCase().includes("only the listing owner")
      ? "Only the listing owner can reply."
      : error.message;
    return { ok: false, reason: "error", message: msg };
  }
  revalidatePath("/studio");
  return { ok: true };
}

/** Maker edits their app's version/changelog/tester goals (owner + app, in RPC). */
export async function saveAppDetails(
  postId: string,
  version: string,
  changelog: string,
  testerGoal: number | null,
  maxTesters: number | null,
): Promise<StudioResult> {
  const { supabase, user } = await actor();
  if (!user) return { ok: false, reason: "auth_required" };
  const { error } = await supabase.rpc("update_app_details", {
    p_post_id: postId,
    p_version: version.trim() || null,
    p_changelog: changelog.trim() || null,
    p_tester_goal: testerGoal,
    p_max_testers: maxTesters,
  });
  if (error) {
    const s = error.message.toLowerCase();
    const msg = s.includes("below the current tester count")
      ? "Max testers can't be below the number who've already joined."
      : error.message;
    return { ok: false, reason: "error", message: msg };
  }
  revalidatePath(`/studio/${postId}`);
  revalidatePath("/studio");
  return { ok: true };
}
