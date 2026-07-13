/** Shared identity types live in the identity module (the CAL-Links seam);
 *  re-exported here so existing Sandbox imports keep working. */
export type { CurrentUser, Profile, Reputation, SupportingColor } from "../lib/identity/types";
import type { Profile, SupportingColor } from "../lib/identity/types";

export type Platform = "ios" | "web";

export type AppStatus = "shipped_weekend" | "needs_testers" | "beta_full" | "live";

export type FilterTag =
  | "shipped-this-weekend"
  | "beta-testers-needed"
  | "campus-essentials"
  | "open-source";

interface PostBase {
  id: string;
  author: Profile;
  title: string;
  description: string;
  upvotes: number;
  createdAt: string; // ISO
  /** live verified-karma boost (0–10); ordering = upvotes + boost, then recency */
  boost?: number;
  /** end of the 3-day boost window; badge derives from this, not the stale bool */
  boostExpiresAt?: string | null;
  /** seeded placeholder post — shows an "Example" badge; actions are disabled */
  isDemo: boolean;
}

export interface AppPost extends PostBase {
  type: "app";
  platform: Platform;
  status: AppStatus;
  /** Pill copy, e.g. "Shipped this weekend" / "Needs 12 testers". */
  statusLabel: string;
  ctaLabel: string;
  ctaUrl: string;
  bannerColor: SupportingColor;
  tags: FilterTag[];
  testersNeeded?: number;
  /** Static badge only — ranking behind it lands once weighting is abuse-resistant. */
  boosted?: boolean;
  /** Session 13c: tester cohort + maker-editable fields (app-only). */
  testerCount: number;
  testerGoal?: number | null;
  maxTesters?: number | null;
  version?: string | null;
  changelog?: string | null;
}

export type ShopStatus = "in_stock" | "made_to_order" | "sold_out";

/** Marketplace ('shop') — recurring student sellers (the Makers Market).
 *  Reviews and the verified-karma boost apply to this category ONLY. */
export interface ShopPost extends PostBase {
  type: "shop";
  priceCents: number;
  /** first tag doubles as the category (ceramics, stickers, …) */
  category: string;
  status: ShopStatus;
  statusLabel: string;
  bannerColor: SupportingColor;
  locationLabel: string;
  tags: string[];
  reviewCount: number;
  /** listing photos; element 0 is the card image (up to 3). Empty/undefined =
   *  no photo → the category color block renders instead (legacy-safe). */
  imageUrls?: string[];
  /** seller's storefront identity (from the author profile row) — drives the
   *  card/detail ShopHeader. Sandbox-owned commerce data on the ShopPost, kept
   *  OFF the shared Profile per IDENTITY.md. Null shopName → individual seller. */
  shopName?: string | null;
  shopTagline?: string | null;
  shopBannerColor?: SupportingColor | null;
}

export type ThriftStatus = "available" | "sold" | "expired";

/** Thrift — one-time used-goods sales (move-out items, a used fridge). No
 *  reviews, no boost: feed ordering is newest-first, full stop. Auto-expires
 *  ~21 days after creation (expiresAt); expired/sold listings drop out. */
export interface ThriftPost extends PostBase {
  type: "thrift";
  priceCents: number;
  /** first tag doubles as the category */
  category: string;
  status: ThriftStatus;
  statusLabel: string;
  bannerColor: SupportingColor;
  locationLabel: string;
  tags: string[];
  /** end of the 21-day listing window; the feed hides listings past this */
  expiresAt?: string | null;
  /** when marked sold; sold items stay in the feed for 24h, then drop out */
  soldAt?: string | null;
  /** single listing photo (element 0). Empty/undefined → color block. */
  imageUrls?: string[];
  /** optional item condition (New/Like new/Good/Used/Well-loved); null = no badge */
  condition?: string | null;
}

/** The two commerce categories share a card shape but never a ranking path. */
export type MarketPost = ShopPost | ThriftPost;

export type Post = AppPost | ShopPost | ThriftPost;

/** Read-only seller credibility aggregate (display fact, never ranking). */
export interface SellerRating {
  count: number;
  avg: number | null;
}

/** Storefront identity — Sandbox-owned commerce fields (Studio-editable), kept
 *  out of the shared identity Profile per IDENTITY.md. */
export interface ShopIdentity {
  shopName: string | null;
  shopTagline: string | null;
  shopBannerColor: SupportingColor | null;
  /** wide storefront banner image (or null → banner-color tint) */
  shopHeroUrl: string | null;
  /** up to 5 specialty chips shown on the storefront block */
  specialtyTags: string[];
  /** "Accepting custom orders" badge toggle */
  acceptsCustom: boolean;
  /** short shop story (≤400 chars) */
  shopStory: string | null;
}

// --- Request system (app-facing views over requests / request_messages) ---

export type { RequestStatus } from "./supabase";
import type { RequestStatus } from "./supabase";

export type PostCategory = "app" | "shop" | "thrift";
export type RequestRole = "buyer" | "seller";

/** Minimal post reference shown in the requests list / thread header. */
export interface RequestPostRef {
  id: string;
  title: string;
  type: PostCategory;
}

/** One row in the /requests inbox (the viewer's own threads). */
export interface RequestSummary {
  id: string;
  post: RequestPostRef;
  /** the other participant (seller if I'm the buyer, and vice-versa) */
  counterpart: Profile;
  role: RequestRole;
  status: RequestStatus;
  lastActivityAt: string;
  messageCount: number;
}

export interface RequestMessage {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  /** true if the viewer sent it (right-aligned in the thread) */
  mine: boolean;
}

/** Studio dashboard aggregates (from the studio_summary RPC). */
export interface StudioActivityWeek {
  week: string;
  upvotes: number;
  testers: number;
}
export interface StudioSummary {
  karmaFromTestersWeek: number;
  newTestersWeek: number;
  activity: StudioActivityWeek[];
}

/** A review/feedback row with the reviewer + optional maker reply, joined to its
 *  post — used in the Studio feedback inbox and app feedback surfaces. */
export interface Feedback {
  id: string;
  postId: string;
  postTitle: string;
  postType: PostCategory;
  reviewer: Profile;
  body: string;
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
}

/** Full thread view (buyer or seller). */
export interface RequestThread {
  id: string;
  post: RequestPostRef;
  buyer: Profile;
  seller: Profile;
  status: RequestStatus;
  myRole: RequestRole;
  messages: RequestMessage[];
}

export type KarmaAction =
  | "upvote_received"
  | "cta_click"
  | "post_shipped"
  | "review_received";

/** Mirrors `karma_ledger` — recorded, never consumed by feed ranking (yet). */
export interface KarmaEvent {
  id: string;
  userId: string;
  action: KarmaAction;
  points: number;
  sourcePostId?: string;
  verified: boolean;
  createdAt: string;
}
