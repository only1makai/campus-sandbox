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
}

export type ProductStatus = "in_stock" | "made_to_order" | "sold_out";

/** Makers Market — physical goods by student makers. */
export interface ProductPost extends PostBase {
  type: "product";
  priceCents: number;
  /** first tag doubles as the category (ceramics, stickers, …) */
  category: string;
  status: ProductStatus;
  statusLabel: string;
  bannerColor: SupportingColor;
  locationLabel: string;
  tags: string[];
  reviewCount: number;
}

export type Post = AppPost | ProductPost;

export type KarmaAction = "upvote_received" | "cta_click" | "post_shipped";

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
