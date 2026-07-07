import MakerCard from "@/components/MakerCard";
import { fetchProducts } from "@/lib/queries";
import { getCurrentUser } from "@/lib/identity";

// Live market — always render from the database, never a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function MarketPage() {
  const [products, user] = await Promise.all([fetchProducts(), getCurrentUser()]);
  const isAuthed = user !== null;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
      <p className="text-meta font-semibold uppercase tracking-[0.14em] text-text-faint">
        Campus Sandbox · UC Santa Cruz
      </p>
      <h1 className="mt-2 font-display text-display text-ink">Makers Market</h1>
      <p className="mt-1 text-body text-text-secondary">
        {products.length} makers selling real things to real slugs.
      </p>

      {/* masonry: CSS columns, visually distinct from the board's uniform grid */}
      <div className="mt-8 columns-1 gap-8 sm:columns-2 lg:columns-3">
        {products.map((product, i) => (
          <MakerCard key={product.id} product={product} index={i} isAuthed={isAuthed} />
        ))}
      </div>
    </main>
  );
}
