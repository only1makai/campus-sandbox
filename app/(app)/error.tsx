"use client";

import { motion } from "framer-motion";
import { fadeUp, tapPress, transitionFast } from "@/lib/motion";

/**
 * Error boundary for signed-in app surfaces (feeds, requests). Keeps the app
 * chrome (it lives inside the (app) group) and offers a retry.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <motion.div
        {...fadeUp}
        className="w-full max-w-md rounded-card border-2 border-ink bg-card p-8 text-center shadow-resting"
      >
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-chip border-2 border-ink bg-tomato text-3xl shadow-resting">
          🐌
        </span>
        <h1 className="mt-4 font-display text-heading text-ink">This corner slipped</h1>
        <p className="mt-2 text-body text-text-secondary">
          Something went wrong loading this page. Give it another go.
        </p>
        {error.digest && (
          <p className="mt-1 text-meta text-text-faint">error digest: {error.digest}</p>
        )}
        <motion.button
          type="button"
          onClick={reset}
          whileTap={tapPress}
          transition={transitionFast}
          className="mt-4 rounded-btn border-2 border-ink bg-gold px-4 py-2 font-sans text-body font-semibold text-ink shadow-resting transition-shadow hover:shadow-elevated hover:bg-gold-hover active:bg-gold-active"
        >
          Try again
        </motion.button>
      </motion.div>
    </main>
  );
}
