"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { AppPost, FilterTag } from "@/types";
import AppCard from "@/components/AppCard";
import { tapPress, transitionFast } from "@/lib/motion";

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
  currentUserId,
  joinedIds = [],
}: {
  apps: AppPost[];
  isAuthed: boolean;
  currentUserId?: string;
  /** post ids the viewer has joined as a tester */
  joinedIds?: string[];
}) {
  const joinedSet = new Set(joinedIds);
  const [active, setActive] = useState<FilterTag | "all">("all");
  const query = (useSearchParams().get("q") ?? "").trim().toLowerCase();

  // Ordering = score (upvotes + capped verified boost), then recency —
  // mirrors the ranked_posts view; cosmetic karma contributes nothing.
  const visible = apps
    .filter((app) => active === "all" || app.tags.includes(active))
    .filter(
      (app) =>
        !query ||
        app.title.toLowerCase().includes(query) ||
        app.description.toLowerCase().includes(query) ||
        app.author.handle.toLowerCase().includes(query),
    )
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
            whileTap={tapPress}
            transition={transitionFast}
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

      {visible.length === 0 && (
        <p className="mt-8 text-body text-text-faint">No apps match &ldquo;{query}&rdquo;.</p>
      )}

      <motion.div layout className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {visible.map((app) => (
            <AppCard
              key={app.id}
              app={app}
              isAuthed={isAuthed}
              currentUserId={currentUserId}
              joined={joinedSet.has(app.id)}
            />
          ))}
        </AnimatePresence>
      </motion.div>
    </main>
  );
}
