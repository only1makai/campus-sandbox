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
 * Full self-service profile edit (display name + bio + college_year + pronouns +
 * links), saved together. Handle/verified/campus stay out of reach. Each field
 * goes through the extended update_profile_identity with its update toggle on.
 */
export async function saveProfileAction(input: {
  displayName: string;
  bio: string;
  collegeYear: string;
  pronouns: string;
  githubUrl: string;
  websiteUrl: string;
  contactEmail: string;
}): Promise<ProfileUpdateResult> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "auth_required" };

  const name = input.displayName.trim();
  if (name.length < 1 || name.length > 60) {
    return { ok: false, reason: "error", message: "Display name must be 1–60 characters." };
  }
  if (input.bio.trim().length > 280) {
    return { ok: false, reason: "error", message: "Bio maxes out at 280 characters." };
  }

  const { error } = await supabase.rpc("update_profile_identity", {
    p_display_name: name,
    p_bio: input.bio.trim() || null,
    p_college_year: input.collegeYear.trim() || null,
    p_pronouns: input.pronouns.trim() || null,
    p_github_url: input.githubUrl.trim() || null,
    p_website_url: input.websiteUrl.trim() || null,
    p_contact_email: input.contactEmail.trim() || null,
    p_update_display_name: true,
    p_update_bio: true,
    p_update_college_year: true,
    p_update_pronouns: true,
    p_update_github: true,
    p_update_website: true,
    p_update_contact_email: true,
  });
  if (error) {
    const s = error.message.toLowerCase();
    const message = s.includes("github_url") || s.includes("website_url")
      ? "Links must start with http:// or https://."
      : s.includes("contact_email")
        ? "That doesn't look like a valid email address."
        : error.message;
    return { ok: false, reason: "error", message };
  }
  return { ok: true };
}

/**
 * Uploads/replaces the caller's avatar image to the `avatars` storage bucket
 * (one fixed path per user, upsert — no orphaned files) and points
 * avatar_image_url at the public URL. Bio is untouched (p_update_bio: false).
 *
 * The whole body after auth is wrapped in try/catch: mobile uploads (spotty
 * networks, iPhone HEIC/File-object edge cases) can make the Storage SDK throw
 * instead of resolving with {error} — with no guard that propagated as an
 * unhandled exception straight to the app's crash boundary. Every failure mode
 * now returns a graceful, human-readable result instead.
 */
export async function uploadAvatarAction(formData: FormData): Promise<AvatarUploadResult> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "auth_required" };

  try {
    const file = formData.get("avatar");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, reason: "error", message: "Choose an image file first." };
    }
    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      const isHeic = file.type === "image/heic" || file.type === "image/heif" || file.type === "";
      return {
        ok: false,
        reason: "error",
        message: isHeic
          ? "HEIC photos aren't supported yet — in Settings → Camera → Formats, choose \"Most Compatible,\" or pick a JPEG/PNG/WebP/GIF."
          : "Avatars must be PNG, JPEG, WebP, or GIF.",
      };
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
  } catch (err) {
    console.error("[avatar] upload threw:", err);
    return {
      ok: false,
      reason: "error",
      message: "Upload failed — try again or use a different photo.",
    };
  }
}
