import type {
  AppPost,
  AppStatus,
  FilterTag,
  Platform,
  Post,
  RequestMessage,
  RequestRole,
  RequestSummary,
  RequestThread,
  SellerRating,
  ShopPost,
  ShopStatus,
  SupportingColor,
  ThriftPost,
  ThriftStatus,
} from "@/types";
import type {
  PostRow,
  ProfileRow,
  RankedPostRow,
  RequestMessageRow,
  RequestRow,
} from "@/types/supabase";
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
 * The live /thrift feed. Like fetchThriftPosts but ALSO keeps `sold` listings
 * visible (rendered faded on the card) while dropping expired ones — per the
 * Thrift feed spec. Structural no-ranking: base `posts` table (never
 * ranked_posts), created_at desc only. A row survives if it's sold, or it's
 * available and still within its expiry window.
 */
export async function fetchThriftFeed(): Promise<ThriftPost[]> {
  if (envMissing()) return [];

  const now = new Date().toISOString();
  const { data, error } = await supabaseAnon()
    .from("posts")
    .select("*, author_profile:profiles!posts_author_fkey(*)")
    .eq("type", "thrift")
    .in("status", ["available", "sold"])
    .or(`status.eq.sold,expires_at.gt.${now}`)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`fetchThriftFeed failed: ${error.message}`);
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

/**
 * Batch seller-rating lookup for a feed — dedupes ids and fans out to the
 * per-seller aggregate RPC. Display-only, never ranking (feed order is set
 * before this runs).
 */
export async function fetchSellerRatings(
  sellerIds: string[],
): Promise<Record<string, SellerRating>> {
  const unique = [...new Set(sellerIds)];
  const entries = await Promise.all(
    unique.map(async (id) => [id, await getSellerRating(id)] as const),
  );
  return Object.fromEntries(entries);
}

// --- Requests / messages (participant-only reads via supabaseServer) ---
//
// requests + request_messages have RLS restricted to buyer/seller. These MUST
// run through supabaseServer() (session-scoped) — supabaseAnon() would silently
// return zero rows. A non-participant gets zero rows too: that IS the denial
// (Session-11/12 denied-vs-empty standard), so callers treat "no row" as
// not-found.

type RequestListRow = RequestRow & {
  post: { id: string; title: string; type: string } | null;
  buyer: ProfileRow | null;
  seller: ProfileRow | null;
  request_messages: { count: number }[];
};

function toRequestSummary(row: RequestListRow, userId: string): RequestSummary {
  const role: RequestRole = row.buyer_id === userId ? "buyer" : "seller";
  const counterpartRow = role === "buyer" ? row.seller : row.buyer;
  return {
    id: row.id,
    post: {
      id: row.post?.id ?? row.post_id,
      title: row.post?.title ?? "(listing removed)",
      type: (row.post?.type ?? "shop") as RequestSummary["post"]["type"],
    },
    // counterpart should always exist (FKs are NOT NULL); fall back defensively.
    counterpart: toProfile(counterpartRow as ProfileRow),
    role,
    status: row.status,
    lastActivityAt: row.last_activity_at,
    messageCount: row.request_messages?.[0]?.count ?? 0,
  };
}

/** The viewer's own request threads (as buyer OR seller), most-recent first. */
export async function fetchMyRequests(userId: string): Promise<RequestSummary[]> {
  if (envMissing()) return [];

  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("requests")
    .select(
      "*, post:posts!requests_post_id_fkey(id,title,type), buyer:profiles!requests_buyer_id_fkey(*), seller:profiles!requests_seller_id_fkey(*), request_messages(count)",
    )
    .order("last_activity_at", { ascending: false });

  if (error) throw new Error(`fetchMyRequests failed: ${error.message}`);
  return (data as unknown as RequestListRow[]).map((row) => toRequestSummary(row, userId));
}

/**
 * A single thread the viewer participates in, with its messages. Returns null
 * when the viewer isn't a participant (RLS returns no row) — the caller renders
 * not-found. Messages are fetched separately (RLS-filtered by the parent).
 */
export async function fetchRequestThread(
  requestId: string,
  userId: string,
): Promise<RequestThread | null> {
  if (envMissing()) return null;

  const supabase = await supabaseServer();
  const { data: reqRow, error: reqError } = await supabase
    .from("requests")
    .select(
      "*, post:posts!requests_post_id_fkey(id,title,type), buyer:profiles!requests_buyer_id_fkey(*), seller:profiles!requests_seller_id_fkey(*)",
    )
    .eq("id", requestId)
    .maybeSingle();

  if (reqError) throw new Error(`fetchRequestThread failed: ${reqError.message}`);
  if (!reqRow) return null; // not a participant, or no such request → not-found

  const row = reqRow as unknown as RequestListRow;

  const { data: msgRows, error: msgError } = await supabase
    .from("request_messages")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });
  if (msgError) throw new Error(`fetchRequestThread (messages) failed: ${msgError.message}`);

  const messages: RequestMessage[] = (msgRows as RequestMessageRow[]).map((m) => ({
    id: m.id,
    senderId: m.sender_id,
    body: m.body,
    createdAt: m.created_at,
    mine: m.sender_id === userId,
  }));

  return {
    id: row.id,
    post: {
      id: row.post?.id ?? row.post_id,
      title: row.post?.title ?? "(listing removed)",
      type: (row.post?.type ?? "shop") as RequestThread["post"]["type"],
    },
    buyer: toProfile(row.buyer as ProfileRow),
    seller: toProfile(row.seller as ProfileRow),
    status: row.status,
    myRole: row.buyer_id === userId ? "buyer" : "seller",
    messages,
  };
}

/**
 * The buyer's own rating on a request, if they've already rated it. Requires
 * migration 014 (self-read policy: auth.uid() = rater_id) — must run through
 * supabaseServer() so RLS sees the caller's session. Returns null both when no
 * rating exists yet and when the viewer isn't the rater (RLS hides the row
 * either way — indistinguishable, which is fine since callers only check this
 * for the buyer on their own request).
 */
export async function fetchMyRating(requestId: string): Promise<number | null> {
  if (envMissing()) return null;

  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("seller_ratings")
    .select("stars")
    .eq("request_id", requestId)
    .maybeSingle();

  if (error) throw new Error(`fetchMyRating failed: ${error.message}`);
  return data?.stars ?? null;
}
