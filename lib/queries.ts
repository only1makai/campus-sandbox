import type {
  AppPost,
  AppStatus,
  FilterTag,
  Platform,
  Post,
  ProductPost,
  ProductStatus,
  SupportingColor,
} from "@/types";
import type { ProfileRow, RankedPostRow } from "@/types/supabase";
import { supabaseAnon } from "@/lib/supabase";
import { toProfile } from "@/lib/identity";
import { apps as appFixtures, products as productFixtures } from "@/lib/fixtures";

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

type ProductWithAuthor = PostWithAuthor & { reviews: { count: number }[] };

function toProductPost(row: ProductWithAuthor): ProductPost {
  return {
    id: row.id,
    type: "product",
    author: toProfile(row.author_profile),
    title: row.title,
    description: row.description,
    upvotes: row.upvotes,
    createdAt: row.created_at,
    boost: row.boost,
    boostExpiresAt: row.boost_expires_at,
    priceCents: row.price_cents ?? 0,
    category: row.tags?.[0] ?? "goods",
    status: (row.status ?? "in_stock") as ProductStatus,
    statusLabel: row.status_label ?? "",
    bannerColor: (row.banner_color ?? "gold") as SupportingColor,
    locationLabel: row.location_label ?? "on campus",
    tags: row.tags ?? [],
    reviewCount: row.reviews?.[0]?.count ?? 0,
  };
}

/**
 * Makers Market feed. Identical ordering contract to the board: score
 * (upvotes + capped verified boost) desc, then recency, via ranked_posts.
 * Falls back to fixtures when Supabase env isn't configured.
 */
export async function fetchProducts(): Promise<ProductPost[]> {
  if (envMissing()) return byUpvotesThenRecency(productFixtures);

  const { data, error } = await supabaseAnon()
    .from("ranked_posts")
    .select("*, author_profile:profiles!posts_author_fkey(*), reviews(count)")
    .eq("type", "product")
    .order("score", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(`fetchProducts failed: ${error.message}`);
  return (data as unknown as ProductWithAuthor[]).map(toProductPost);
}

/**
 * Posts (apps + products) by one author, for the profile page's "shipped"
 * list. Same score-then-recency ordering; boost is only ever non-zero on
 * product rows (reviews are the only verified-karma path).
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
  return (data as unknown as ProductWithAuthor[]).map((row) =>
    row.type === "app" ? toAppPost(row) : toProductPost(row),
  );
}
