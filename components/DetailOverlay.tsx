"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

/**
 * Client wrapper for the intercepted detail overlay. Dims + blurs the feed
 * behind, dismisses on backdrop tap / Esc / the floating × / browser Back
 * (all via router.back(), which unwinds the intercept and returns to the feed).
 * On mobile it becomes a full-screen sheet; on desktop a centered card.
 */
export default function DetailOverlay({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const close = () => router.back();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    // lock body scroll while the overlay is up
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={close}
      className="fixed inset-0 z-50 flex items-stretch justify-center overflow-y-auto bg-ink/40 backdrop-blur-sm sm:items-start sm:p-6 sm:py-10"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl bg-card shadow-elevated sm:rounded-card sm:border-2 sm:border-ink"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink bg-card text-ink shadow-resting transition-shadow hover:shadow-elevated hover:bg-paper"
        >
          <X size={18} />
        </button>
        {children}
      </div>
    </div>
  );
}
