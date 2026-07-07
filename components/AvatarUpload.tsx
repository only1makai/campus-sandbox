"use client";

import { useRef, useState, useTransition } from "react";
import { Camera } from "lucide-react";
import type { SupportingColor } from "@/types";
import { uploadAvatarAction } from "@/app/actions/profile";

const FILL: Record<SupportingColor, string> = {
  gold: "bg-gold",
  "live-green": "bg-live-green",
  "link-blue": "bg-link-blue",
  tomato: "bg-tomato",
  grape: "bg-grape",
};

/**
 * Avatar — rounded-square sticker portrait if an image is set, flat
 * avatar_color tile with initial otherwise. Both wear the same border/shadow
 * treatment so the fallback reads as a choice, not a broken image. The
 * camera-icon edit affordance only renders for the profile owner.
 */
export default function AvatarUpload({
  handle,
  avatarColor,
  initialImageUrl,
  isOwn,
}: {
  handle: string;
  avatarColor: SupportingColor;
  initialImageUrl: string | null;
  isOwn: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const handlePick = (file: File) => {
    setError(null);
    setPreview(URL.createObjectURL(file));
    const formData = new FormData();
    formData.set("avatar", file);
    startTransition(async () => {
      const result = await uploadAvatarAction(formData);
      setPreview(null);
      if (!result.ok) {
        setError(result.message ?? "Upload failed — try again.");
        return;
      }
      setImageUrl(result.url);
    });
  };

  const shown = preview ?? imageUrl;

  return (
    <div className="flex flex-col gap-1">
      <div className="group relative h-20 w-20 shrink-0">
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage public URL
          <img
            src={shown}
            alt={`@${handle} avatar`}
            className="h-20 w-20 rotate-[2deg] rounded-chip border-2 border-ink object-cover shadow-[2px_2px_0_#262014]"
          />
        ) : (
          <span
            className={`flex h-20 w-20 rotate-[2deg] items-center justify-center rounded-chip border-2 border-ink font-display text-4xl font-extrabold text-white shadow-[2px_2px_0_#262014] ${FILL[avatarColor]}`}
          >
            {handle[0].toUpperCase()}
          </span>
        )}

        {isOwn && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              aria-label="Change avatar"
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink bg-gold text-ink opacity-0 shadow-[2px_2px_0_#262014] transition-opacity group-hover:opacity-100 disabled:opacity-60"
            >
              <Camera size={14} />
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePick(file);
                e.target.value = "";
              }}
            />
          </>
        )}
      </div>
      {error && <p className="max-w-[9rem] text-[11px] font-semibold text-tomato">{error}</p>}
    </div>
  );
}
