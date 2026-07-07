import "server-only"; // build-time guard: this module must never reach a client bundle
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

/**
 * Anon client — public reads only (RLS: select on profiles/posts).
 * Lazy so `pnpm build` doesn't require env vars at import time.
 */
export function supabaseAnon(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local",
    );
  }
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}

/**
 * Service-role client — SERVER ONLY. Used by server actions to call the
 * karma functions and by the seed script. Bypasses RLS; never import from
 * client components.
 */
export function supabaseService(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
  }
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}
