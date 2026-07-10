import "server-only"; // identity reads sessions/cookies — server modules only

/**
 * SHARED IDENTITY MODULE — the seam a second product (CAL-Links) reuses.
 *
 * Rule: this module knows about platform identity ONLY (auth session,
 * profiles, handles, the @ucsc.edu gate, read-only reputation). It imports
 * nothing Sandbox-specific; Sandbox features import from it, never the
 * reverse. See docs/IDENTITY.md and docs/CALINKS_ONBOARDING.md.
 */

import { supabaseServer } from "@/lib/supabase/server";
import type { ProfileRow } from "@/types/supabase";
import type { CurrentUser, Profile, Reputation, SupportingColor } from "./types";

export type { CurrentUser, Profile, Reputation, SupportingColor };

// ---------------------------------------------------------------------------
// Verification gate + handle rules (mirrored by DB triggers/constraints —
// the database versions are authoritative; these give friendly errors early)
// ---------------------------------------------------------------------------

/** The @ucsc.edu gate IS the "verified student" mechanism (platform-wide,
 *  hard-enforced by a BEFORE INSERT trigger on auth.users). */
export const UCSC_EMAIL_PATTERN = /@ucsc\.edu$/i;

export function isUcscEmail(email: string): boolean {
  return UCSC_EMAIL_PATTERN.test(email.trim());
}

/** Handles are permanent, unique, cross-product identifiers (DB: UNIQUE +
 *  format CHECK; immutable to users — no update path exposes them). Client
 *  rule is 2–27 chars so the signup trigger's collision suffix fits in 32. */
export const HANDLE_PATTERN = /^[a-z0-9._-]{2,27}$/;

export function isValidHandle(handle: string): boolean {
  return HANDLE_PATTERN.test(handle);
}

// ---------------------------------------------------------------------------
// Profile access
// ---------------------------------------------------------------------------

export function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    handle: row.handle,
    displayName: row.display_name,
    campus: row.campus,
    verified: row.verified,
    avatarColor: row.avatar_color as SupportingColor,
    avatarImageUrl: row.avatar_image_url,
    bio: row.bio,
    collegeYear: row.college_year,
    pronouns: row.pronouns,
    githubUrl: row.github_url,
    websiteUrl: row.website_url,
    contactEmail: row.contact_email,
  };
}

/** The authenticated user + their shared profile row. The only source of
 *  "who is acting" in any product. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    // No env → nobody can be signed in. Warn instead of throwing so the
    // NavBar (rendered in the root layout) doesn't take down every page.
    console.warn("[identity] Supabase env missing — rendering signed-out");
    return null;
  }
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: row } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? "",
    profile: row ? toProfile(row) : null,
  };
}

export async function getProfileById(id: string): Promise<Profile | null> {
  const supabase = await supabaseServer();
  const { data: row } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return row ? toProfile(row) : null;
}

export async function getProfileByHandle(handle: string): Promise<Profile | null> {
  const supabase = await supabaseServer();
  const { data: row } = await supabase
    .from("profiles")
    .select("*")
    .eq("handle", handle.toLowerCase())
    .maybeSingle();
  return row ? toProfile(row) : null;
}

// ---------------------------------------------------------------------------
// Reputation — read-only platform fact. GUARDRAIL: display only; this value
// must never feed feed/market ordering.
// ---------------------------------------------------------------------------

export async function getReputation(profileId: string): Promise<Reputation> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("profile_reputation", {
    p_profile_id: profileId,
  });
  if (error || !data) {
    console.warn("[identity] reputation fetch failed:", error?.message);
    return { totalKarma: 0, verifiedKarma: 0, cosmeticKarma: 0, badges: [] };
  }
  const raw = data as {
    total_karma: number;
    verified_karma: number;
    cosmetic_karma: number;
    badges: string[];
  };
  return {
    totalKarma: raw.total_karma,
    verifiedKarma: raw.verified_karma,
    cosmeticKarma: raw.cosmetic_karma,
    badges: raw.badges,
  };
}
