"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Clock } from "lucide-react";
import type { SellerRating, ThriftPost } from "@/types";
import MakerCard from "@/components/MakerCard";

/**
 * Thrift feed. Newest-first is STRUCTURAL: the order comes from the query
 * (base posts table, created_at desc) and there is deliberately NO sort control
 * — a fixed, non-interactive "Newest first" pill states the rule the UI
 * enforces. No ranking language anywhere on this surface.
 */
export default function ThriftFeed({
  listings,
  ratings,
  isAuthed,
  currentUserId,
}: {
  listings: ThriftPost[];
  ratings: Record<string, SellerRating>;
  isAuthed: boolean;
  currentUserId?: string;
}) {
  const query = (useSearchParams().get("q") ?? "").trim().toLowerCase();

  // Filter only — never re-sort (order is fixed newest-first from the query).
  const visible = listings.filter(
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
      <h1 className="mt-2 font-display text-display text-ink">Thrift</h1>
      <p className="mt-1 text-body text-text-secondary">
        Secondhand and one-time finds from fellow Slugs · {listings.length} listings
      </p>

      {/* fixed newest-first indicator — NOT a control */}
      <div className="mt-5">
        <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-border-soft bg-cream px-4 py-1.5 font-sans text-meta font-semibold text-text-secondary">
          <Clock size={13} />
          Newest first
        </span>
      </div>

      {listings.length === 0 ? (
        <div className="mt-10 rounded-card border-2 border-dashed border-border-soft bg-cream p-10 text-center">
          <p className="font-display text-heading text-ink">Nothing in Thrift right now</p>
          <p className="mt-1 text-body text-text-secondary">
            Be the first to clear out your dorm.
          </p>
          <Link
            href="/sell"
            className="mt-4 inline-flex items-center justify-center rounded-btn border-2 border-ink bg-gold px-4 py-2 font-sans text-meta font-semibold text-ink shadow-resting transition-shadow hover:shadow-elevated hover:bg-gold-hover"
          >
            Sell something →
          </Link>
        </div>
      ) : (
        <>
          {visible.length === 0 && (
            <p className="mt-8 text-body text-text-faint">No finds match “{query}”.</p>
          )}
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
        </>
      )}
    </main>
  );
}
