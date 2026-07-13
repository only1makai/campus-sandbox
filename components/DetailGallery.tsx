"use client";

import { useState } from "react";
import type { SupportingColor } from "@/types";
import { FILL } from "@/lib/colors";

/**
 * Detail-view image area. >1 photo → hero + thumb strip + dots (shop, up to 3);
 * exactly 1 → single hero (thrift); 0 → the category color block with the post's
 * initial (app posts have no images, and photo-less legacy listings fall here
 * too — same treatment as the cards, so it reads intentional, not broken).
 */
export default function DetailGallery({
  images,
  bannerColor,
  title,
  letter,
}: {
  images: string[];
  bannerColor: SupportingColor;
  title: string;
  letter: string;
}) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className={`flex aspect-[4/3] w-full items-center justify-center ${FILL[bannerColor]}`}>
        <span className="flex h-20 w-20 items-center justify-center rounded-chip border-2 border-ink bg-card font-display text-5xl font-extrabold text-ink shadow-resting">
          {letter}
        </span>
      </div>
    );
  }

  const current = images[Math.min(active, images.length - 1)];

  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-cream">
        {/* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage public URL */}
        <img src={current} alt={title} className="h-full w-full object-cover" />
        {images.length > 1 && (
          <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-1.5">
            {images.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === active ? "w-4 bg-ink" : "w-1.5 bg-ink/40"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 px-4">
          {images.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Photo ${i + 1}`}
              className={`h-14 w-14 shrink-0 overflow-hidden rounded-chip border-2 ${
                i === active ? "border-ink" : "border-ink/30"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage public URL */}
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
