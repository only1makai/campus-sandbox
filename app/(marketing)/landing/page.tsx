import type { Metadata } from "next";
import type { MarketPost, SellerRating } from "@/types";
import Landing from "@/components/Landing";
import {
  fetchApps,
  fetchShopPosts,
  fetchThriftPreview,
  getSellerRating,
} from "@/lib/queries";

// Real posts, always live — never a build-time snapshot.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Campus Sandbox — for verified UCSC students",
  description: "Student-built apps and student-made goods, from your fellow Slugs.",
};

// TODO: replace with the real support address before launch.
const CONTACT_EMAIL = "hello@campus-sandbox.app";

export default async function LandingPage() {
  const [apps, shop, thrift] = await Promise.all([
    fetchApps(),
    fetchShopPosts(),
    fetchThriftPreview(3),
  ]);

  // §1 mixes real shop + thrift, capped at 4; render however many exist (no padding).
  const shopPreview = shop.slice(0, 3);
  const market: MarketPost[] = [...shopPreview, ...thrift.slice(0, 2)].slice(0, 4);

  // Seller star aggregates for the shop cards (anon RPC; display only).
  const ratingEntries = await Promise.all(
    shopPreview.map(
      async (s) => [s.author.id, await getSellerRating(s.author.id)] as const,
    ),
  );
  const ratings: Record<string, SellerRating> = Object.fromEntries(ratingEntries);

  return (
    <Landing
      apps={apps.slice(0, 3)}
      market={market}
      ratings={ratings}
      makerRows={shopPreview}
      contactEmail={CONTACT_EMAIL}
    />
  );
}
