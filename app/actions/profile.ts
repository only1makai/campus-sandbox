"use server";

import { supabaseServer } from "@/lib/supabase/server";

export type ProfileUpdateResult =
  | { ok: true }
  | { ok: false; reason: "auth_required" | "error"; message?: string };

/**
 * Edits the caller's OWN shared-identity fields (bio, avatar image) via
 * update_profile_identity(). Handle/verified/campus are not touchable here —
 * handles are permanent platform identifiers (docs/IDENTITY.md).
 */
export async function updateProfileAction(input: {
  bio: string;
  avatarImageUrl: string;
}): Promise<ProfileUpdateResult> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "auth_required" };

  const avatarImageUrl = input.avatarImageUrl.trim();
  if (avatarImageUrl && !/^https?:\/\//i.test(avatarImageUrl)) {
    return { ok: false, reason: "error", message: "Avatar URL must start with http(s)://" };
  }
  if (input.bio.trim().length > 280) {
    return { ok: false, reason: "error", message: "Bio maxes out at 280 characters." };
  }

  const { error } = await supabase.rpc("update_profile_identity", {
    p_bio: input.bio.trim() || null,
    p_avatar_image_url: avatarImageUrl || null,
  });
  if (error) return { ok: false, reason: "error", message: error.message };
  return { ok: true };
}
