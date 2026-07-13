"use server";

import { randomUUID } from "crypto";
import { supabaseServer } from "@/lib/supabase/server";

const MAX_LISTING_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export type ListingImageResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

/**
 * Uploads one listing photo (or a shop hero) to the `listing-images` bucket and
 * returns its public URL. The caller's uid prefixes the path so the owner-prefix
 * INSERT policy allows it; object names are random so two picks never collide
 * (there is no UPDATE policy — listings are creation-only). The whole body after
 * auth is wrapped in try/catch (the Session-14 avatar-crash lesson: mobile HEIC /
 * File edge cases can make the Storage SDK throw rather than resolve with {error}).
 *
 * `token` groups a single draft's photos under one folder; `kind='hero'` routes a
 * storefront banner under {uid}/hero/ instead.
 */
export async function uploadListingImage(formData: FormData): Promise<ListingImageResult> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Please sign in to add photos." };

  try {
    const file = formData.get("image");
    const kind = String(formData.get("kind") ?? "listing");
    const token = String(formData.get("token") ?? "").replace(/[^a-zA-Z0-9-]/g, "");

    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, message: "Choose an image file first." };
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      const isHeic = file.type === "image/heic" || file.type === "image/heif" || file.type === "";
      return {
        ok: false,
        message: isHeic
          ? 'HEIC photos aren’t supported yet — set your camera to "Most Compatible," or use a JPEG/PNG/WebP.'
          : "Photos must be PNG, JPEG, WebP, or GIF.",
      };
    }
    if (file.size > MAX_LISTING_BYTES) {
      return { ok: false, message: "Photos max out at 5MB — try a smaller image." };
    }

    const ext = (file.type.split("/")[1] ?? "jpg").replace("jpeg", "jpg");
    const folder = kind === "hero" ? "hero" : token || randomUUID();
    const path = `${user.id}/${folder}/${randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("listing-images")
      .upload(path, file, { contentType: file.type });
    if (uploadError) {
      return { ok: false, message: uploadError.message };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("listing-images").getPublicUrl(path);
    return { ok: true, url: publicUrl };
  } catch (err) {
    console.error("[listing-image] upload threw:", err);
    return { ok: false, message: "Upload failed — try again or use a different photo." };
  }
}
