"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import type { SellerRating, ShopPost } from "@/types";
import MakerCard from "@/components/MakerCard";

type Sort = "top" | "newest";

export default function MakersMarket({
  products,
  ratings,
  isAuthed,
  currentUserId,
}: {
  products: ShopPost[];
  ratings: Record<string, SellerRating>;
  isAuthed: boolean;
  currentUserId?: string;
}) {
  const query = (useSearchParams().get("q") ?? "").trim().toLowerCase();
  const [sort, setSort] = useState<Sort>("top");

  const filtered = products.filter(
    (p) =>
      !query ||
      p.title.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query) ||
      p.author.handle.toLowerCase().includes(query),
  );

  // "Top rated" keeps the server's ranked order (score = upvotes + verified
  // boost, then recency). "Newest" reorders by recency. Star ratings NEVER
  // drive ordering (COMMERCE.md guardrail) — this sorts on neither.
  const visible =
    sort === "newest"
      ? [...filtered].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      : filtered;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
      <p className="text-meta font-semibold uppercase tracking-[0.14em] text-text-faint">
        Campus Sandbox · UC Santa Cruz
      </p>
      <h1 className="mt-2 font-display text-display text-ink">Marketplace</h1>
      <p className="mt-1 text-body text-text-secondary">
        Recurring storefronts from verified UCSC sellers · {products.length} listings
      </p>

      {/* sort control — only the two orders the backend already supports */}
      <div className="mt-5 flex items-center gap-2">
        {(
          [
            ["top", "Top rated"],
            ["newest", "Newest"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSort(key)}
            className={`rounded-full border-2 px-4 py-1.5 font-sans text-meta font-semibold ${
              sort === key
                ? "border-ink bg-ink text-white"
                : "border-border-soft bg-cream text-ink hover:border-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {visible.length === 0 && (
        <p className="mt-8 text-body text-text-faint">
          {query ? `No listings match “${query}”.` : "No storefronts yet."}
        </p>
      )}

      {/* masonry: CSS columns, visually distinct from the board's uniform grid */}
      <div className="mt-8 columns-1 gap-8 sm:columns-2 lg:columns-3">
        {visible.map((product, i) => (
          <MakerCard
            key={product.id}
            product={product}
            index={i}
            isAuthed={isAuthed}
            currentUserId={currentUserId}
            rating={ratings[product.author.id]}
          />
        ))}
      </div>
    </main>
  );
}
