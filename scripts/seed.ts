import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./env.mjs";
import { apps } from "../lib/fixtures";
import type { Profile } from "../types";

/**
 * Seeds the 6 Beta Board apps from lib/fixtures.ts.
 * Profiles are backed by real auth.users rows (created via the admin API)
 * because profiles.id → auth.uid() — the shared identity model.
 *
 * Run: pnpm exec tsx scripts/seed.ts
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
    .select("*", { count: "exact", head: true });
  if (countError) {
    throw new Error(
      `could not check posts table (is the schema applied?): ${countError.message}`,
    );
  }
  if ((count ?? 0) > 0) {
    console.log(`posts already has ${count} rows — skipping seed.`);
    return;
  }

  // unique profiles across the fixture apps
  const profiles = new Map<string, Profile>();
  for (const app of apps) profiles.set(app.author.handle, app.author);

  const idByHandle = new Map<string, string>();

  for (const profile of profiles.values()) {
    const { data, error } = await db.auth.admin.createUser({
      // must pass the auth.users @ucsc.edu gate trigger
      email: `${profile.handle.replace(/[^a-z0-9.]/g, "")}@ucsc.edu`,
      password: crypto.randomUUID(),
      email_confirm: true,
    });
    if (error || !data.user) {
      throw new Error(`auth user for @${profile.handle} failed: ${error?.message}`);
    }
    idByHandle.set(profile.handle, data.user.id);

    const { error: profileError } = await db.from("profiles").insert({
      id: data.user.id,
      handle: profile.handle,
      display_name: profile.displayName,
      campus: profile.campus,
      verified: profile.verified,
      avatar_color: profile.avatarColor,
    });
    if (profileError) {
      throw new Error(`profile @${profile.handle} failed: ${profileError.message}`);
    }
    console.log(`profile @${profile.handle} → ${data.user.id}`);
  }

  for (const app of apps) {
    const { error } = await db.from("posts").insert({
      type: "app",
      author: idByHandle.get(app.author.handle)!,
      title: app.title,
      description: app.description,
      upvotes: app.upvotes,
      platform: app.platform,
      status: app.status,
      status_label: app.statusLabel,
      cta_label: app.ctaLabel,
      cta_url: app.ctaUrl,
      banner_color: app.bannerColor,
      testers_needed: app.testersNeeded ?? null,
      boosted: app.boosted ?? false,
      tags: app.tags,
      created_at: app.createdAt,
    });
    if (error) {
      throw new Error(`post ${app.title} failed: ${error.message}`);
    }
    console.log(`post ${app.title} seeded`);
  }

  console.log("seed complete: 6 apps, 6 profiles.");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
