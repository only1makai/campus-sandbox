import MakersMarket from "@/components/MakersMarket";
import { fetchProducts } from "@/lib/queries";
import { getCurrentUser } from "@/lib/identity";

// Live market — always render from the database, never a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function MarketPage() {
  const [products, user] = await Promise.all([fetchProducts(), getCurrentUser()]);
  return <MakersMarket products={products} isAuthed={user !== null} />;
}
