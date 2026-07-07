"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AppPost, FilterTag } from "@/types";
import AppCard from "@/components/AppCard";

const FILTERS: { label: string; tag: FilterTag | "all" }[] = [
  { label: "All", tag: "all" },
  { label: "Shipped This Weekend", tag: "shipped-this-weekend" },
  { label: "Beta Testers Needed", tag: "beta-testers-needed" },
  { label: "Campus Essentials", tag: "campus-essentials" },
  { label: "Open Source", tag: "open-source" },
];

export default function BetaBoard({
  apps,
  isAuthed,
}: {
  apps: AppPost[];
  isAuthed: boolean;
}) {
  const [active, setActive] = useState<FilterTag | "all">("all");

  // Ordering = score (upvotes + capped verified boost), then recency —
  // mirrors the ranked_posts view; cosmetic karma contributes nothing.
  const visible = apps
    .filter((app) => active === "all" || app.tags.includes(active))
    .sort(
      (a, b) =>
        b.upvotes + (b.boost ?? 0) - (a.upvotes + (a.boost ?? 0)) ||
        Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
      <p className="text-meta font-semibold uppercase tracking-[0.14em] text-text-faint">
        Campus Sandbox · UC Santa Cruz
      </p>
      <h1 className="mt-2 font-display text-display text-ink">Beta Board</h1>
      <p className="mt-1 text-body text-text-secondary">
        {apps.length} apps shipped by slugs.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <motion.button
            key={f.tag}
            type="button"
            onClick={() => setActive(f.tag)}
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.16, ease: [0.34, 1.56, 0.64, 1] }}
            className={`rounded-full border-2 px-4 py-1.5 font-sans text-meta font-semibold ${
              active === f.tag
                ? "border-ink bg-ink text-white"
                : "border-border-soft bg-cream text-ink hover:border-ink"
            }`}
          >
            {f.label}
          </motion.button>
        ))}
      </div>

      <motion.div layout className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {visible.map((app, i) => (
            <AppCard key={app.id} app={app} index={i} isAuthed={isAuthed} />
          ))}
        </AnimatePresence>
      </motion.div>
    </main>
  );
}
