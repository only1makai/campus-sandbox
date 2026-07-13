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
      p.author.handle.toLowerCase().includes(query) ||
      p.author.displayName.toLowerCase().includes(query),
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-display text-ink">Marketplace</h1>
          <p className="mt-1 text-body text-text-secondary">
            Recurring storefronts from verified UCSC sellers · {products.length} listings
          </p>
        </div>

        {/* sort control — only the two orders the backend already supports */}
        <label className="flex shrink-0 items-center gap-2 self-start rounded-btn border-2 border-ink bg-card px-3 py-1.5 text-meta font-semibold text-ink shadow-resting">
          Sort:
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="cursor-pointer bg-transparent font-semibold text-ink focus:outline-none"
            aria-label="Sort listings"
          >
            <option value="top">Top rated</option>
            <option value="newest">Newest</option>
          </select>
        </label>
      </div>

      {visible.length === 0 && (
        <p className="mt-8 text-body text-text-faint">
          {query ? `No listings match “${query}”.` : "No storefronts yet."}
        </p>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((product) => (
          <MakerCard
            key={product.id}
            product={product}
            isAuthed={isAuthed}
            currentUserId={currentUserId}
            rating={ratings[product.author.id]}
          />
        ))}
      </div>
    </main>
  );
}
