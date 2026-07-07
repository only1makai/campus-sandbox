import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./env.mjs";

/**
 * Resets a seeded account's password to a securely generated random value.
 * The value is never printed or stored — seed accounts never log in
 * interactively.
 *
 * Run: node scripts/rotate-seed-password.mjs <profile-handle>
 */
loadEnv();

const handle = process.argv[2];
if (!handle) {
  console.error("usage: node scripts/rotate-seed-password.mjs <profile-handle>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

const { data: profile, error: lookupError } = await db
  .from("profiles")
  .select("id, handle")
  .eq("handle", handle)
  .single();
if (lookupError || !profile) {
  console.error(`profile @${handle} not found:`, lookupError?.message);
  process.exit(1);
}

const { error } = await db.auth.admin.updateUserById(profile.id, {
  password: crypto.randomBytes(32).toString("base64url"),
});
if (error) {
  console.error("password rotation failed:", error.message);
  process.exit(1);
}

console.log(`password for @${profile.handle} rotated to a random value (not stored, not printed).`);
