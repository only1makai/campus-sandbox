"use server";

import { supabaseServer } from "@/lib/supabase/server";

export type ProfileUpdateResult =
  | { ok: true }
  | { ok: false; reason: "auth_required" | "error"; message?: string };

export type AvatarUploadResult =
  | { ok: true; url: string }
  | { ok: false; reason: "auth_required" | "error"; message?: string };

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

/**
 * Edits the caller's OWN bio only — avatar_image_url is untouched
 * (p_update_avatar: false). Handle/verified/campus stay out of reach:
 * handles are permanent platform identifiers (docs/IDENTITY.md).
 */
export async function updateProfileAction(input: {
  bio: string;
}): Promise<ProfileUpdateResult> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "auth_required" };

  if (input.bio.trim().length > 280) {
    return { ok: false, reason: "error", message: "Bio maxes out at 280 characters." };
  }

  const { error } = await supabase.rpc("update_profile_identity", {
    p_bio: input.bio.trim() || null,
    p_update_bio: true,
    p_update_avatar: false,
  });
  if (error) return { ok: false, reason: "error", message: error.message };
  return { ok: true };
}

/**
 * Uploads/replaces the caller's avatar image to the `avatars` storage bucket
 * (one fixed path per user, upsert — no orphaned files) and points
 * avatar_image_url at the public URL. Bio is untouched (p_update_bio: false).
 */
export async function uploadAvatarAction(formData: FormData): Promise<AvatarUploadResult> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "auth_required" };

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, reason: "error", message: "Choose an image file first." };
  }
  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    return { ok: false, reason: "error", message: "Avatars must be PNG, JPEG, WebP, or GIF." };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { ok: false, reason: "error", message: "Avatars max out at 5MB." };
  }

  const path = `${user.id}/avatar`;
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) {
    return { ok: false, reason: "error", message: uploadError.message };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);
  // cache-bust so the new image shows immediately after an upsert
  const url = `${publicUrl}?v=${Date.now()}`;

  const { error: rpcError } = await supabase.rpc("update_profile_identity", {
    p_avatar_image_url: url,
    p_update_bio: false,
    p_update_avatar: true,
  });
  if (rpcError) return { ok: false, reason: "error", message: rpcError.message };

  return { ok: true, url };
}
