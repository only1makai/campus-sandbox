/**
 * SHARED platform identity types. This file (and lib/identity/ generally)
 * must stay free of product concepts — no posts, karma actions, or reviews.
 * Products (Campus Sandbox today, CAL-Links later) import from here.
 */

/** Flat avatar-fill token. NOTE: vocabulary comes from the Sandbox design
 *  system — flagged in docs/IDENTITY.md as a mild coupling. */
export type SupportingColor = "gold" | "live-green" | "link-blue" | "tomato" | "grape";

export interface Profile {
  id: string;
  handle: string;
  displayName: string;
  campus: string;
  verified: boolean;
  avatarColor: SupportingColor;
  /** optional real avatar; avatarColor is the fallback */
  avatarImageUrl?: string | null;
  bio?: string | null;
  collegeYear?: string | null;
  pronouns?: string | null;
  githubUrl?: string | null;
  websiteUrl?: string | null;
  contactEmail?: string | null;
  instagramUrl?: string | null;
}

export interface CurrentUser {
  id: string;
  email: string;
  profile: Profile | null; // null only in the brief window before the trigger row lands
}

/** Read-only, cross-product reputation. Display fact ONLY — never ranking. */
export interface Reputation {
  totalKarma: number;
  verifiedKarma: number;
  cosmeticKarma: number;
  badges: string[];
}
