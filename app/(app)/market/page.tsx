import MakersMarket from "@/components/MakersMarket";
import { fetchSellerRatings, fetchShopPosts } from "@/lib/queries";
import { getCurrentUser } from "@/lib/identity";

// Live market — always render from the database, never a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function MarketPage() {
  const [products, user] = await Promise.all([fetchShopPosts(), getCurrentUser()]);
  const ratings = await fetchSellerRatings(products.map((p) => p.author.id));
  return (
    <MakersMarket
      products={products}
      ratings={ratings}
      isAuthed={user !== null}
      currentUserId={user?.id}
    />
  );
}
