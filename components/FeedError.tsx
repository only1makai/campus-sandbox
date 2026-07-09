"use client";

import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { tapPress, transitionFast } from "@/lib/motion";

/** Feed-scoped error card ("Couldn't load … / Check your connection / Retry"). */
export default function FeedError({
  reset,
  label = "listings",
}: {
  reset: () => void;
  label?: string;
}) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
      <div className="flex items-center justify-between gap-4 rounded-card border-2 border-tomato bg-tomato/10 p-5">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-display text-card-title text-ink">
            <AlertCircle size={18} className="shrink-0 text-tomato" />
            Couldn&apos;t load {label}
          </p>
          <p className="mt-1 text-body text-text-secondary">Check your connection.</p>
        </div>
        <motion.button
          type="button"
          onClick={reset}
          whileTap={tapPress}
          transition={transitionFast}
          className="shrink-0 rounded-btn border-2 border-ink bg-card px-4 py-2 font-sans text-meta font-semibold text-ink shadow-resting transition-shadow hover:shadow-elevated hover:bg-paper"
        >
          Retry
        </motion.button>
      </div>
    </main>
  );
}
