import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { loadListing } from "@/lib/detail";
import ListingDetail from "@/components/ListingDetail";

export const dynamic = "force-dynamic";

const FEED: Record<string, { href: string; label: string }> = {
  app: { href: "/", label: "Beta Board" },
  shop: { href: "/market", label: "Marketplace" },
  thrift: { href: "/thrift", label: "Thrift" },
};

/**
 * Bare-shell detail page — the shareable, stable URL. Rendered on direct visits
 * and refreshes (the intercepting @modal slot only fires on in-app navigation),
 * so it shows no feed behind it and carries the "shared link" note per the d3
 * mockup. Same ListingDetail shell as the overlay.
 */
export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadListing(id);
  if (!data) notFound();

  const feed = FEED[data.post.type] ?? FEED.shop;

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
      <p className="mb-3 text-meta font-semibold text-text-faint">Opened from a shared link</p>
      <div className="overflow-hidden rounded-card border-2 border-ink bg-card shadow-resting">
        <ListingDetail data={data} />
      </div>
      <Link
        href={feed.href}
        className="mt-5 inline-flex items-center gap-1.5 text-meta font-semibold text-link-blue hover:underline"
      >
        <ArrowLeft size={15} /> Browse {feed.label}
      </Link>
    </main>
  );
}
