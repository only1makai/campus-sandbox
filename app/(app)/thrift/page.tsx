import ThriftFeed from "@/components/ThriftFeed";
import { fetchSellerRatings, fetchThriftFeed } from "@/lib/queries";
import { getCurrentUser } from "@/lib/identity";

// Live thrift feed — always render from the database, never a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function ThriftPage() {
  const [listings, user] = await Promise.all([fetchThriftFeed(), getCurrentUser()]);
  const ratings = await fetchSellerRatings(listings.map((p) => p.author.id));
  return (
    <ThriftFeed
      listings={listings}
      ratings={ratings}
      isAuthed={user !== null}
      currentUserId={user?.id}
    />
  );
}
