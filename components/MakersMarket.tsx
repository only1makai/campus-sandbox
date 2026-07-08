"use client";

import { useSearchParams } from "next/navigation";
import type { ProductPost } from "@/types";
import MakerCard from "@/components/MakerCard";

export default function MakersMarket({
  products,
  isAuthed,
}: {
  products: ProductPost[];
  isAuthed: boolean;
}) {
  const query = (useSearchParams().get("q") ?? "").trim().toLowerCase();

  const visible = products.filter(
    (p) =>
      !query ||
      p.title.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query) ||
      p.author.handle.toLowerCase().includes(query),
  );

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
      <p className="text-meta font-semibold uppercase tracking-[0.14em] text-text-faint">
        Campus Sandbox · UC Santa Cruz
      </p>
      <h1 className="mt-2 font-display text-display text-ink">Makers Market</h1>
      <p className="mt-1 text-body text-text-secondary">
        {products.length} makers selling real things to real slugs.
      </p>

      {visible.length === 0 && (
        <p className="mt-8 text-body text-text-faint">No makers match &ldquo;{query}&rdquo;.</p>
      )}

      {/* masonry: CSS columns, visually distinct from the board's uniform grid */}
      <div className="mt-8 columns-1 gap-8 sm:columns-2 lg:columns-3">
        {visible.map((product, i) => (
          <MakerCard key={product.id} product={product} index={i} isAuthed={isAuthed} />
        ))}
      </div>
    </main>
  );
}
