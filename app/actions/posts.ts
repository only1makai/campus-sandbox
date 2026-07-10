"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

/** Same discriminated-union convention as app/actions/karma.ts + requests.ts. */
export type CreateListingInput = {
  type: "shop" | "thrift";
  title: string;
  description: string;
  priceCents: number;
  category: string;
  location: string;
  bannerColor: string;
};

export type CreateListingResult =
  | { ok: true; id: string }
  | { ok: false; reason: "auth_required" | "error"; message?: string };

/** Map a raw DB error to human copy; the RPC's validation strings are already
 *  friendly, so only the rate-limit one is rewritten. */
function friendly(message: string): string {
  if (message.toLowerCase().includes("posting limit reached")) {
    return "You've hit today's posting limit — try again tomorrow.";
  }
  return message;
}

/**
 * Create a shop or thrift listing. The ONLY write path to posts is the
 * create_post security-definer RPC (posts has no INSERT policy); it re-validates
 * everything server-side and derives the author from auth.uid(). Must run
 * through supabaseServer() so the session/auth context reaches the RPC.
 */
export async function createListing(input: CreateListingInput): Promise<CreateListingResult> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "auth_required" };

  const { data, error } = await supabase.rpc("create_post", {
    p_type: input.type,
    p_title: input.title,
    p_description: input.description,
    p_price_cents: input.priceCents,
    p_category: input.category,
    p_location: input.location,
    p_banner_color: input.bannerColor,
  });

  if (error || !data) {
    return {
      ok: false,
      reason: "error",
      message: friendly(error?.message ?? "Couldn't create the listing."),
    };
  }

  revalidatePath(input.type === "shop" ? "/market" : "/thrift");
  return { ok: true, id: data };
}
