"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, X } from "lucide-react";
import { uploadListingImage } from "@/app/actions/listing-images";
import { downscaleImage } from "@/lib/image";

/**
 * Wide storefront banner uploader (3:1). Single image, stored under the caller's
 * hero/ prefix. Same downscale + try/catch upload path as the listing photos.
 */
export default function HeroUploader({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startT] = useTransition();

  const pick = (file: File) => {
    setError(null);
    startT(async () => {
      const prepared = await downscaleImage(file, 2000).catch(() => file);
      const fd = new FormData();
      fd.set("image", prepared);
      fd.set("kind", "hero");
      const result = await uploadListingImage(fd);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onChange(result.url);
    });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between text-meta font-semibold text-ink">
        Shop banner
        <span className="font-normal text-text-faint">3:1 works best</span>
      </span>

      {value ? (
        <div className="relative aspect-[3/1] w-full overflow-hidden rounded-card border-2 border-ink shadow-resting">
          {/* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage public URL */}
          <img src={value} alt="Shop banner" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Remove banner"
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink bg-card text-ink shadow-resting hover:bg-tomato hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="flex aspect-[3/1] w-full flex-col items-center justify-center gap-1 rounded-card border-2 border-dashed border-ink/40 bg-cream text-text-secondary transition-colors hover:border-ink hover:text-ink disabled:opacity-60"
        >
          <ImagePlus size={22} />
          <span className="text-meta font-semibold">{busy ? "Adding…" : "Add a banner"}</span>
        </button>
      )}

      {error && <span className="text-meta font-semibold text-tomato">{error}</span>}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) pick(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
