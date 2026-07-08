import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./env.mjs";
import { shopListings as products } from "../lib/fixtures";
import type { Profile } from "../types";

/**
 * Seeds the 6 Marketplace ('shop') sellers from lib/fixtures.ts.
 * Same pattern as scripts/seed.ts: maker profiles are backed by real
 * auth.users rows (admin API, @ucsc.edu emails to pass the gate trigger).
 * Idempotent: skips if any type='shop' posts exist.
 *
 * Run: pnpm exec tsx scripts/seed-makers.ts
 */
async function main() {
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
  }

  const db = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { count, error: countError } = await db
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq("type", "shop");
  if (countError) {
    throw new Error(`could not check posts table: ${countError.message}`);
  }
  if ((count ?? 0) > 0) {
    console.log(`posts already has ${count} shop rows — skipping seed.`);
    return;
  }

  const profiles = new Map<string, Profile>();
  for (const product of products) profiles.set(product.author.handle, product.author);

  const idByHandle = new Map<string, string>();

  for (const profile of profiles.values()) {
    const { data, error } = await db.auth.admin.createUser({
      email: `${profile.handle.replace(/[^a-z0-9.]/g, "")}@ucsc.edu`,
      password: crypto.randomUUID(),
      email_confirm: true,
    });
    if (error || !data.user) {
      throw new Error(`auth user for @${profile.handle} failed: ${error?.message}`);
    }
    idByHandle.set(profile.handle, data.user.id);

    // the signup trigger already created a profile row — align it with fixtures
    const { error: profileError } = await db
      .from("profiles")
      .update({
        handle: profile.handle,
        display_name: profile.displayName,
        avatar_color: profile.avatarColor,
      })
      .eq("id", data.user.id);
    if (profileError) {
      throw new Error(`profile @${profile.handle} failed: ${profileError.message}`);
    }
    console.log(`maker @${profile.handle} → ${data.user.id}`);
  }

  for (const product of products) {
    const { error } = await db.from("posts").insert({
      type: "shop",
      author: idByHandle.get(product.author.handle)!,
      title: product.title,
      description: product.description,
      upvotes: product.upvotes,
      status: product.status,
      status_label: product.statusLabel,
      banner_color: product.bannerColor,
      tags: product.tags,
      price_cents: product.priceCents,
      location_label: product.locationLabel,
      created_at: product.createdAt,
    });
    if (error) {
      throw new Error(`product ${product.title} failed: ${error.message}`);
    }
    console.log(`product ${product.title} seeded`);
  }

  console.log("seed complete: 6 products, 6 maker profiles.");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
