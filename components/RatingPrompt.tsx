"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { motion } from "framer-motion";
import { rateSeller } from "@/app/actions/requests";
import { tapPress, transitionFast } from "@/lib/motion";

/**
 * One-time buyer rating, shown once a request is fulfilled. `existingRating`
 * (from fetchMyRating — the self-read policy added in migration 014) lets this
 * render read-only on reload instead of only right after submit; a resubmit
 * attempt would in any case be blocked by the UNIQUE(request_id) constraint,
 * surfaced as a calm "already rated" message.
 */
export default function RatingPrompt({
  requestId,
  existingRating = null,
}: {
  requestId: string;
  existingRating?: number | null;
}) {
  const [value, setValue] = useState(0);
  const [hover, setHover] = useState(0);
  const [done, setDone] = useState<number | null>(existingRating);
  const [error, setError] = useState<string | null>(null);
  const [busy, startT] = useTransition();

  const active = hover || value;

  const submit = () => {
    if (value < 1) return;
    setError(null);
    startT(async () => {
      const result = await rateSeller(requestId, value);
      if (!result.ok) {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setDone(value);
    });
  };

  if (done !== null) {
    return (
      <div className="rounded-card border-2 border-ink bg-cream p-4">
        <p className="text-meta font-semibold text-ink">You rated this seller:</p>
        <div className="mt-1 flex items-center gap-0.5" aria-hidden>
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              size={20}
              className={n <= done ? "text-gold" : "text-border-soft"}
              fill={n <= done ? "currentColor" : "none"}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-card border-2 border-ink bg-cream p-4">
      <p className="text-meta font-semibold text-ink">How was it? Rate the seller.</p>
      <div className="mt-2 flex items-center gap-1" role="radiogroup" aria-label="Star rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            aria-checked={value === n}
            role="radio"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setValue(n)}
            className="rounded p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            <Star
              size={26}
              className={n <= active ? "text-gold" : "text-border-soft"}
              fill={n <= active ? "currentColor" : "none"}
            />
          </button>
        ))}
      </div>
      {error && (
        <p className="mt-2 rounded-chip border-2 border-ink bg-tomato px-2 py-1 text-meta font-semibold text-white">
          {error}
        </p>
      )}
      <motion.button
        type="button"
        onClick={submit}
        disabled={busy || value < 1}
        whileTap={tapPress}
        transition={transitionFast}
        className="mt-3 rounded-btn border-2 border-ink bg-gold px-4 py-2 font-sans text-meta font-semibold text-ink shadow-resting transition-shadow hover:shadow-elevated hover:bg-gold-hover active:bg-gold-active disabled:opacity-60"
      >
        {busy ? "Submitting…" : "Submit rating"}
      </motion.button>
    </div>
  );
}
