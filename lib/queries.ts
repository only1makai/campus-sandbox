import type {
  AppPost,
  AppStatus,
  FilterTag,
  Platform,
  Post,
  SellerRating,
  ShopPost,
  ShopStatus,
  SupportingColor,
  ThriftPost,
  ThriftStatus,
} from "@/types";
import type { PostRow, ProfileRow, RankedPostRow } from "@/types/supabase";
import { supabaseAnon } from "@/lib/supabase";
import { supabaseServer } from "@/lib/supabase/server";
import { toProfile } from "@/lib/identity";
import { apps as appFixtures, shopListings as shopFixtures } from "@/lib/fixtures";

function envMissing(): boolean {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn("[queries] Supabase env missing — serving fixture data");
    return true;
  }
  return false;
}

/** Same ordering contract as the live queries: upvotes desc, then recency. */
function byUpvotesThenRecency<T extends { upvotes: number; createdAt: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => b.upvotes - a.upvotes || Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
}

type PostWithAuthor = RankedPostRow & { author_profile: ProfileRow };

function toAppPost(row: PostWithAuthor): AppPost {
  return {
    id: row.id,
    type: "app",
    author: toProfile(row.author_profile),
    title: row.title,
    description: row.description,
    upvotes: row.upvotes,
    createdAt: row.created_at,
    boost: row.boost,
    boostExpiresAt: row.boost_expires_at,
    platform: (row.platform ?? "web") as Platform,
    status: (row.status ?? "live") as AppStatus,
    statusLabel: row.status_label ?? "",
    ctaLabel: row.cta_label ?? "Open",
    ctaUrl: row.cta_url ?? "#",
    bannerColor: (row.banner_color ?? "gold") as SupportingColor,
    tags: (row.tags ?? []) as FilterTag[],
    testersNeeded: row.testers_needed ?? undefined,
    boosted: row.boosted,
  };
}

type ShopWithAuthor = PostWithAuthor & { reviews: { count: number }[] };

function toShopPost(row: ShopWithAuthor): ShopPost {
  return {
    id: row.id,
    type: "shop",
    author: toProfile(row.author_profile),
    title: row.title,
    description: row.description,
    upvotes: row.upvotes,
    createdAt: row.created_at,
    boost: row.boost,
    boostExpiresAt: row.boost_expires_at,
    priceCents: row.price_cents ?? 0,
    category: row.tags?.[0] ?? "goods",
    status: (row.status ?? "in_stock") as ShopStatus,
    statusLabel: row.status_label ?? "",
    bannerColor: (row.banner_color ?? "gold") as SupportingColor,
    locationLabel: row.location_label ?? "on campus",
    tags: row.tags ?? [],
    reviewCount: row.reviews?.[0]?.count ?? 0,
  };
}

/** Thrift never carries boost/reviews — this reads only the base post fields,
 *  so it works for both the plain `posts` query and a `ranked_posts` row. */
function toThriftPost(row: PostRow & { author_profile: ProfileRow }): ThriftPost {
  return {
    id: row.id,
    type: "thrift",
    author: toProfile(row.author_profile),
    title: row.title,
    description: row.description,
    upvotes: row.upvotes,
    createdAt: row.created_at,
    priceCents: row.price_cents ?? 0,
    category: row.tags?.[0] ?? "goods",
    status: (row.status ?? "available") as ThriftStatus,
    statusLabel: row.status_label ?? "",
    bannerColor: (row.banner_color ?? "gold") as SupportingColor,
    locationLabel: row.location_label ?? "on campus",
    tags: row.tags ?? [],
    expiresAt: row.expires_at,
  };
}

function toPost(row: ShopWithAuthor): Post {
  if (row.type === "app") return toAppPost(row);
  if (row.type === "thrift") return toThriftPost(row);
  return toShopPost(row);
}

/**
 * Beta Board feed. Ordering = score (upvotes + capped verified boost) desc,
 * then recency, via the ranked_posts view — the single home of the formula.
 * Cosmetic karma contributes nothing.
 */
export async function fetchApps(): Promise<AppPost[]> {
  if (envMissing()) return byUpvotesThenRecency(appFixtures);

  const { data, error } = await supabaseAnon()
    .from("ranked_posts")
    .select("*, author_profile:profiles!posts_author_fkey(*)")
    .eq("type", "app")
    .order("score", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(`fetchApps failed: ${error.message}`);
  return (data as unknown as PostWithAuthor[]).map(toAppPost);
}

/**
 * Marketplace ('shop') feed — recurring sellers. Same ordering contract as the
 * board: score (upvotes + capped verified boost) desc, then recency, via
 * ranked_posts. Reviews/boost are shop-only, so this is the only commerce feed
 * that ranking touches at all.
 */
export async function fetchShopPosts(): Promise<ShopPost[]> {
  if (envMissing()) return byUpvotesThenRecency(shopFixtures);

  const { data, error } = await supabaseAnon()
    .from("ranked_posts")
    .select("*, author_profile:profiles!posts_author_fkey(*), reviews(count)")
    .eq("type", "shop")
    .order("score", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(`fetchShopPosts failed: ${error.message}`);
  return (data as unknown as ShopWithAuthor[]).map(toShopPost);
}

/**
 * Thrift feed — one-time used-goods sales. Ordering is NEWEST FIRST, full stop:
 * no upvote/karma/rating influence, so this deliberately queries the base
 * `posts` table (not ranked_posts) and orders on created_at alone. Sold and
 * expired listings drop out (status='available' + a live expiry window).
 */
export async function fetchThriftPosts(): Promise<ThriftPost[]> {
  if (envMissing()) return [];

  const { data, error } = await supabaseAnon()
    .from("posts")
    .select("*, author_profile:profiles!posts_author_fkey(*)")
    .eq("type", "thrift")
    .eq("status", "available")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) throw new Error(`fetchThriftPosts failed: ${error.message}`);
  return (data as unknown as (PostRow & { author_profile: ProfileRow })[]).map(toThriftPost);
}

/**
 * Read-only thrift preview for the public landing page. UNLIKE fetchThriftPosts
 * (the future live feed, which shows only available listings), this deliberately
 * includes sold/expired listings — newest first, capped — so the landing can
 * render the "sold" state. No ranking influence (base `posts`, created_at only).
 */
export async function fetchThriftPreview(limit = 4): Promise<ThriftPost[]> {
  if (envMissing()) return [];

  const { data, error } = await supabaseAnon()
    .from("posts")
    .select("*, author_profile:profiles!posts_author_fkey(*)")
    .eq("type", "thrift")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`fetchThriftPreview failed: ${error.message}`);
  return (data as unknown as (PostRow & { author_profile: ProfileRow })[]).map(toThriftPost);
}

/**
 * Posts (apps + shop + thrift) by one author, for the profile page's "shipped"
 * list. Same score-then-recency ordering; boost is only ever non-zero on shop
 * rows (reviews are the only verified-karma path).
 */
export async function fetchPostsByAuthor(authorId: string): Promise<Post[]> {
  if (envMissing()) return [];

  const { data, error } = await supabaseAnon()
    .from("ranked_posts")
    .select("*, author_profile:profiles!posts_author_fkey(*), reviews(count)")
    .eq("author", authorId)
    .order("score", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(`fetchPostsByAuthor failed: ${error.message}`);
  return (data as unknown as ShopWithAuthor[]).map(toPost);
}

/**
 * Posts one user has upvoted, for the "Upvoted" personal view. karma_ledger
 * has no anon read surface — only a narrow self-read RLS policy
 * (auth.uid() = actor_id, migration 008) — so this MUST run through the
 * session-scoped server client, not supabaseAnon(), or RLS silently
 * returns zero rows.
 */
export async function fetchUpvotedPosts(actorId: string): Promise<Post[]> {
  if (envMissing()) return [];

  const supabase = await supabaseServer();
  const { data: ledgerRows, error: ledgerError } = await supabase
    .from("karma_ledger")
    .select("source_post_id")
    .eq("actor_id", actorId)
    .eq("action", "upvote_received");
  if (ledgerError) throw new Error(`fetchUpvotedPosts (ledger) failed: ${ledgerError.message}`);

  const postIds = [
    ...new Set(
      (ledgerRows ?? [])
        .map((r) => r.source_post_id)
        .filter((id): id is string => id !== null),
    ),
  ];
  if (postIds.length === 0) return [];

  const { data, error } = await supabaseAnon()
    .from("ranked_posts")
    .select("*, author_profile:profiles!posts_author_fkey(*), reviews(count)")
    .in("id", postIds)
    .order("score", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(`fetchUpvotedPosts failed: ${error.message}`);
  return (data as unknown as ShopWithAuthor[]).map(toPost);
}

/**
 * Seller star-rating aggregate — a read-only display fact, exposed through the
 * SAME shape as profile_reputation (an owner-privileged aggregate RPC; public
 * to anon). GUARDRAIL: this value feeds NO ranking/ordering anywhere. Kept in
 * the Sandbox query layer (not lib/identity) so the shared identity seam stays
 * free of commerce concepts.
 */
export async function getSellerRating(sellerId: string): Promise<SellerRating> {
  if (envMissing()) return { count: 0, avg: null };

  const { data, error } = await supabaseAnon().rpc("seller_rating_summary", {
    p_seller_id: sellerId,
  });
  if (error || !data) {
    console.warn("[queries] seller rating fetch failed:", error?.message);
    return { count: 0, avg: null };
  }
  const raw = data as { count: number; avg: number | null };
  return { count: raw.count ?? 0, avg: raw.avg ?? null };
}
