import { notFound } from "next/navigation";
import { loadListing } from "@/lib/detail";
import ListingDetail from "@/components/ListingDetail";
import DetailOverlay from "@/components/DetailOverlay";

export const dynamic = "force-dynamic";

/**
 * Intercepted detail — fires when a listing is opened via in-app navigation from
 * a feed. Renders the same shell inside the dimmed/blurred overlay; the feed
 * stays mounted behind it (the children slot is untouched by the interception),
 * and browser Back / Esc / backdrop all dismiss it back to the feed.
 */
export default async function InterceptedListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await loadListing(id);
  if (!data) notFound();

  return (
    <DetailOverlay>
      <div className="max-h-[88vh] overflow-y-auto sm:rounded-card">
        <ListingDetail data={data} />
      </div>
    </DetailOverlay>
  );
}
