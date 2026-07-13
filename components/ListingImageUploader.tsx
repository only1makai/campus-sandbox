"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, X, Star } from "lucide-react";
import { uploadListingImage } from "@/app/actions/listing-images";
import { downscaleImage } from "@/lib/image";

/**
 * Listing photo picker. `max=3` → shop MultiImageUploader (slot 0 badged MAIN,
 * "Make main" reorder); `max=1` → thrift single slot. Photos downscale on the
 * client (canvas, no dependency) before upload; upload happens here, before the
 * form submits, so a failed upload surfaces inline and never crashes the page.
 * `value` is the ordered list of public URLs — element 0 is the card image.
 */
export default function ListingImageUploader({
  max,
  token,
  value,
  onChange,
}: {
  max: number;
  token: string;
  value: string[];
  onChange: (urls: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startT] = useTransition();
  const multi = max > 1;

  const pick = (file: File) => {
    setError(null);
    startT(async () => {
      const prepared = await downscaleImage(file).catch(() => file);
      const fd = new FormData();
      fd.set("image", prepared);
      fd.set("token", token);
      const result = await uploadListingImage(fd);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onChange([...value, result.url].slice(0, max));
    });
  };

  const removeAt = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const makeMain = (i: number) =>
    onChange([value[i], ...value.filter((_, idx) => idx !== i)]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-meta font-semibold text-ink">
          {multi ? "Photos" : "Photo"}
        </span>
        <span className="text-meta text-text-faint">
          {multi ? `Photo 1 is your card image · ${value.length}/${max}` : "Thrift is single-image — one quick photo"}
        </span>
      </div>

      <div className="flex flex-wrap gap-3">
        {value.map((url, i) => (
          <div
            key={url}
            className="relative h-24 w-24 overflow-hidden rounded-chip border-2 border-ink shadow-resting"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage public URL */}
            <img src={url} alt={`Listing photo ${i + 1}`} className="h-full w-full object-cover" />
            {multi && i === 0 && (
              <span className="absolute left-1 top-1 rounded-full border border-ink bg-gold px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink">
                Main
              </span>
            )}
            <button
              type="button"
              onClick={() => removeAt(i)}
              aria-label={`Remove photo ${i + 1}`}
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full border border-ink bg-card text-ink shadow-resting hover:bg-tomato hover:text-white"
            >
              <X size={12} />
            </button>
            {multi && i > 0 && (
              <button
                type="button"
                onClick={() => makeMain(i)}
                className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-ink/70 py-0.5 text-[10px] font-semibold text-white"
              >
                <Star size={10} /> Make main
              </button>
            )}
          </div>
        ))}

        {value.length < max && (
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-chip border-2 border-dashed border-ink/40 bg-cream text-text-secondary transition-colors hover:border-ink hover:text-ink disabled:opacity-60"
          >
            <ImagePlus size={20} />
            <span className="text-[11px] font-semibold">{busy ? "Adding…" : "Add photo"}</span>
          </button>
        )}
      </div>

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
