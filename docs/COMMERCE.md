# Commerce — categories, requests, ratings (Session 12)

*Applied live against the Supabase project on 2026-07-08. Backend only — the
UI for thrift, requests, and ratings lands in a later session (restrained
Session-11 style).*

Campus Sandbox commerce is Sandbox-owned (not shared identity). Three pieces
ship together here: the **category split**, the **ephemeral Request system**,
and **seller star ratings**. The through-line is a single guardrail:
**karma/reviews/ranking touch `shop` only; thrift and ratings never influence
any ordering.**

## A. Categories — `post_type` enum

`posts.type` is now `('app', 'shop', 'thrift')` (was `('app', 'product')`).
Migration `009` did the rename in place (`ALTER TYPE ... RENAME VALUE
'product' → 'shop'`), so all existing rows migrated with no `UPDATE` — the 6
seeded makers plus the Session-7 "Loop Threads: Scarf Run" ranking-test post
(7 rows total) are all `shop`.

| Category | Meaning | Reviews / verified-karma boost | Feed ordering |
|---|---|---|---|
| `app` | Beta Board apps | no (never had) | score = upvotes + boost, then recency |
| `shop` | Marketplace — recurring sellers (Makers Market, "Marketplace" in UI later) | **yes** — the only commerce category that can be reviewed / boosted | score = upvotes + boost, then recency (`ranked_posts`) |
| `thrift` | One-time used-goods sales (move-out fridge, etc.) | **no** — `record_review` rejects it | **newest first, full stop** — no upvote/karma/rating influence |

- **Reviews are shop-only.** `record_review()` raises a clear error on non-shop
  posts (migration `010`). Because reviews are the *only* verified-karma path,
  and boost derives only from verified karma on that post, **thrift is
  structurally incapable of accruing a boost** — verified live.
- **Thrift ordering** deliberately queries the base `posts` table (not
  `ranked_posts`) and orders on `created_at` alone (`fetchThriftPosts` in
  `lib/queries.ts`) so no score/boost can ever leak in.
- **Thrift auto-expiry.** `posts.expires_at` (nullable; null for app/shop) is
  stamped `now() + 21 days` by a `BEFORE INSERT` trigger for thrift rows only.
  Sellers end a listing early with `update_thrift_status(post, 'sold')`
  (author-only; also stamps `sold_at` — Session 14). Thrift `status` vocabulary:
  `available` / `sold` / `expired`.
- **Sold-item lifecycle (Session 14).** `posts.sold_at` records when a thrift
  item was marked sold; un-marking (`update_thrift_status(post, 'available')`)
  clears it. The live `/thrift` feed (`fetchThriftFeed`) shows an available
  listing until `expires_at`, and a **sold** listing (faded, "No longer
  available") for **24h after `sold_at`**, then drops it from public view. The
  row is **never deleted** — sold posts persist forever as the seller's sales
  history. **No automated deletion of any post exists anywhere** (the only cron
  that touches thrift, `expire_thrift_posts`, merely flips lapsed *available* →
  *expired*); if a deletion job is ever added, sold posts must be permanently
  exempt. (The older `fetchThriftPosts` accessor, available-only, is not the
  live feed.)
- `ranked_posts` was recreated (DROP+CREATE) so its `select p.*` now also
  surfaces `expires_at`; the score formula is byte-identical to migration `006`.

## B. Request system — ephemeral buyer↔seller contact

Works on **both** shop and thrift posts.

**Tables**
- `requests` — `id, post_id, buyer_id, seller_id (denormalized from
  posts.author), status (open/fulfilled/declined/expired), created_at,
  last_activity_at`. `CHECK (buyer_id <> seller_id)`.
- `request_messages` — `id, request_id, sender_id, body (1–1000 chars),
  created_at`. Hard cap **20 messages per request**, enforced by a `BEFORE
  INSERT` trigger (message #21 is rejected with a clear error).

**RLS — the critical shape.** Exactly the buyer and the seller can read a
request and its messages; no other authenticated user. Policies:
`auth.uid() = buyer_id OR auth.uid() = seller_id` on `requests`, and the
parent-participant `EXISTS` check on `request_messages`. Verified live with a
real third account: the row exists (confirmed via service-role) yet the third
account's `SELECT` returns **zero rows** — proving *denial*, not emptiness
(the Session-11 "blocked SELECT is silently empty" lesson).

**Writes** go through security-definer functions (same pattern as
karma/reviews), which re-check participation defensively (definer rights bypass
RLS, so the function — not a policy — is the write gate):
- `create_request(post_id)` — buyer = `auth.uid()`, seller denormalized from
  the post. **Rate limit: max 10 new requests per buyer per rolling 24h.**
- `send_request_message(request_id, body)` — sender must be a participant;
  bumps `last_activity_at`; the 20-cap trigger guards the count.
- `update_request_status(request_id, status)` — either participant may set
  open/fulfilled/declined; `expired` is system-only (cron).

## C. Seller star ratings — profile-level credibility

**Table** `seller_ratings` — `id, request_id (UNIQUE), rater_id, seller_id,
stars (1–5), created_at`.

- `rate_seller(request_id, stars)` — only the **buyer** on that request, only
  when `status = 'fulfilled'`, **exactly once** (the `UNIQUE(request_id)`
  enforces it). Self-rating is impossible by construction: `requests` already
  enforces `buyer_id <> seller_id`.
- **Aggregate**: `seller_rating_summary(seller_id)` returns `{count, avg}`
  (owner-privileged, granted to `anon`) — the only public window into the
  table, exactly like `karma_ledger → profile_reputation`. Individual rows are
  private (RLS on, no `SELECT` policy). The read accessor is
  `getSellerRating()` in `lib/queries.ts` — kept in the Sandbox query layer
  (NOT `lib/identity`) so the shared identity seam stays free of commerce
  concepts (see `IDENTITY.md`).

## Ephemeral vs permanent — the retention model

| Data | Lifetime |
|---|---|
| `requests`, `request_messages` | **Ephemeral.** Hard-deleted by cron. |
| `seller_ratings` | **Permanent reputation.** Survives its request's deletion. |

The design point: `seller_ratings.request_id` has **no foreign key** to
`requests` — it's a plain `UNIQUE uuid` (a historical receipt), so deleting the
request cascades to messages but **never touches the rating**. `rater_id` /
`seller_id` are denormalized copies captured at rating time (FKs to `profiles`
mirror `karma_ledger`: `seller_id ON DELETE CASCADE`, `rater_id ON DELETE SET
NULL`). Verified live: after a fulfilled request was aged and hard-deleted, the
rating row and the aggregate (count 1, avg 5) were unchanged.

## Scheduled cleanup — one scheduler (pg_cron), two jobs

`pg_cron` 1.6.4 is available on this Supabase plan and was enabled in-DB
(`CREATE EXTENSION pg_cron`, migration `013`) — self-contained in migrations,
no Vercel-cron route needed.

| Job | Schedule | Action |
|---|---|---|
| `thrift-expiry` | `30 * * * *` | `expire_thrift_posts()` — flip lapsed thrift `available → expired` |
| `request-retention` | `0 * * * *` | `cleanup_expired_requests()` — hard-delete requests (+ cascade messages) that are fulfilled/declined and idle > 48h, **OR** idle > 14 days regardless of status |

## Guardrails (non-negotiable this session)

- **Star ratings affect NO ranking/ordering anywhere.** Display-only
  credibility. Thrift ordering is newest-first with zero score influence.
- **Ratings write NO `karma_ledger` rows.** Whether a rating should ever feed
  karma is a deliberate **future** design decision — intentionally NOT wired
  here.
- The Session-11 `karma_ledger` self-read policy (`auth.uid() = actor_id`) and
  every existing karma guardrail are untouched.

## UI surface map (Session 13b)

The UI for the above backend. No schema/RLS/migration changes — reads/writes go
through the existing RPCs + new query accessors only.

| Route | Purpose | States |
|---|---|---|
| `/market` | Marketplace feed (shop). Sort: Top rated (ranked order) / Newest. Seller stars on cards. | loading skeleton, empty, error (shared `(app)/error.tsx`) |
| `/thrift` | Thrift feed. **Newest-first, no sort control** (fixed non-interactive pill). Sold = faded + "No longer available"; expired dropped; ≤2-days-left urgent (tomato) chip. Seller stars shown (display-only). | loading skeleton, honest empty ("Nothing in Thrift right now" → Sell), error |
| `/requests` | The viewer's own threads (buyer∪seller, role-labelled). Auth-gated. | loading, empty, error |
| `/requests/[id]` | Thread: messages, composer, `n/20` count indicator, status pill, ephemerality note. Seller: mark fulfilled / decline. Buyer (fulfilled): rating prompt. Non-participant → "Request not found" (RLS zero-rows). | not-found/denied, closed/at-cap composer, error |
| `/sell` | Post-creation picker (shop vs thrift, consequences in copy) → real `SellForm` (Session 13d). Submit → `create_post` RPC → redirect to `/market` or `/thrift`. | field validation inline, rate-limit + generic error |

New accessors (`lib/queries.ts`): `fetchThriftFeed` (available+sold, drops expired), `fetchSellerRatings` (batch), `fetchMyRequests`, `fetchRequestThread`, `fetchMyRating` (all `supabaseServer`, participant/rater-only). Actions (`app/actions/requests.ts`): `startRequest`, `sendMessage`, `setRequestStatus`, `rateSeller`, `markThriftSold`. Shared components: `RatingStars`, `SellerBadge`, `RequestButton`, `MessageComposer`, `RequestActions`, `RequestStatusPill`, `RatingPrompt`, `MarkSoldButton`, `MobileNav`, `FeedSkeleton`.

### Fixed: seller_ratings self-read (migration 014)
`seller_ratings` had RLS on with **zero** policies — a total default-deny, even
for the rater themself (the rating prompt couldn't tell "never rated" from
"rated, can't read it back"). Migration `014` adds a narrow self-read policy —
`using (auth.uid() = rater_id)` — mirroring the `karma_ledger` fix (migration
`008`). A user can only ever see their own rating rows, never another rater's
or another seller's individual rows; the public aggregate
(`seller_rating_summary`) and the write path (`rate_seller`) are unchanged.
`fetchMyRating(requestId)` now backs `RatingPrompt`'s read-only "already rated"
state on reload, not just immediately after submit.

## D. Post creation — `create_post` (Session 13d, migration 015)

The first user-facing write path to `posts`. **`posts` still has zero INSERT
policies** — it stays default-deny for direct inserts; `create_post` (security
definer, `grant execute to authenticated` only) is the single door, same
precedent as `record_review` / `rate_seller` / `create_request`.

**Contract** — `create_post(p_type, p_title, p_description, p_price_cents,
p_category, p_location, p_banner_color) returns uuid`. Author is always
`auth.uid()` (never a parameter). Server-side validation (re-checked regardless
of the client): `type ∈ {shop, thrift}` — **`app` is explicitly rejected**;
title 2–80; description 3–500; `price_cents` 1–1,000,000 ($0.01–$10,000);
`category` ∈ a per-type allowlist (shop: ceramics/apparel/prints/stickers/
jewelry/plants/flowers/candles/fiber/art/food/service/other; thrift: furniture/
electronics/textbooks/clothing/kitchen/decor/bikes/other) → stored as `tags[1]`;
location 2–60; `banner_color` ∈ the 5 flat tokens. Sets `status`/`status_label`
by type; leaves `expires_at` to the migration-010 trigger (thrift → +21d);
writes **no** `karma_ledger` row (creating a post grants no karma).

**Rate limit: 5 new posts per author per rolling 24h** (tighter than
`create_request`'s 10/24h — posting should be rarer than contacting sellers).
Rejection surfaced as a human message.

**Moderation stance: posts go live immediately** — no review queue. A deliberate
choice for a small, fully `@ucsc.edu`-gated launch population. **Revisit when
volume demands** (spam/abuse pressure is the trigger to add a queue).

Feed integration is zero-touch: new shop posts enter `/market` via the existing
`ranked_posts` path (unboosted/unreviewed → they rank accordingly); new thrift
posts land at the top of `/thrift` (base table, newest-first).

## E. Listing photos + condition + storefront identity (Session 16, migration 021)

**Image contract.** `posts.image_urls text[]` (nullable). **Element 0 is the card
image**; the rest show only in the detail-view gallery. Count is enforced in
`create_post` (not a table constraint, which can't branch on type): **≤3 for shop,
≤1 for thrift**. Each URL must point at our Storage public prefix
(`.../storage/v1/object/public/listing-images/`) — an off-site URL is rejected.
`null`/empty is always allowed, so legacy rows and app posts are unaffected and
render the category color block exactly as before. **Photos have zero effect on
ranking, karma, or boost** — `ranked_posts` was DROP+CREATE'd only so `select p.*`
surfaces the new columns; the score formula is byte-identical to migration 006/017.

**Condition.** `posts.condition text` (nullable), **thrift only**, **optional**.
Allowlist (table CHECK + RPC): `New / Like new / Good / Used / Well-loved`.
`create_post` rejects a condition on a shop post; a new thrift post may omit it
(stored null → renders no badge, same as pre-021 thrift rows). Un-viewable rows
never grow a placeholder.

**Per-type description bounds (changed).** `create_post` description validation was
a flat **3–500**; it is now **per-type: shop 3–600, thrift 3–280**. Titles (2–80),
price ($0.01–$10,000), category allowlists, location (2–60), banner color, the
`app`-rejection, the 5-posts/24h rate limit, and "creating a post grants no karma"
are all unchanged. `create_post` grew from 7 args to 9 (`p_image_urls`,
`p_condition`); the revoke/grant arg lists and `types/supabase.ts` were updated to
match. `posts` still has **no INSERT/UPDATE policy** — `create_post` remains the
only write door.

**Storefront identity (extends Session 14).** `profiles` gains `shop_hero_url text`,
`specialty_tags text[]` (CHECK ≤5), `accepts_custom boolean not null default false`,
`shop_story text` (CHECK ≤400). Written Studio-only via `update_shop_profile` (grew
3→7 args, same owner-only gate; tag-count and story-length validated in-RPC too).
Read via the Sandbox accessor `fetchShopIdentity` (kept out of `lib/identity` per
IDENTITY.md). Unset fields render nothing on the public storefront block (no
placeholders); a profile with no shop identity renders exactly as before.

**Storage: `listing-images` bucket.** Public read, 5 MB cap, `png/jpeg/webp/gif`.
Two `storage.objects` policies only — public SELECT and owner-prefix INSERT
(`(storage.foldername(name))[1] = auth.uid()::text`). **No UPDATE/DELETE policies**,
tying to the creation-only limitation: there is no listing-edit path, and re-picking
a photo in the uploader writes a fresh path rather than overwriting. Path scheme:
listing photos `{uid}/{draftToken}/{n}.{ext}`, shop hero `{uid}/hero/{token}.{ext}`.

**Creation-time-only + orphaned objects (future concern).** Photos and condition are
set at creation and cannot be edited afterward (the documented no-edit gap). Because
there is no DELETE policy and no post-deletion path, Storage objects for a listing
persist even if a draft is abandoned mid-upload — **orphaned-object cleanup is not
built** and only becomes relevant once post deletion exists (at which point sold
posts must stay exempt, per CLAUDE.md's data-permanence rule). Noted, not built.

## Demo posts (Session 13e)

`posts.is_demo` flags the seeded placeholder content (backfilled by the 12
fixture author handles; real `create_post` rows default to `false`). Demo posts
stay in normal feed position and counts and show an "Example" chip — they read as
real content with a clear marker, not segregated filler. Their commitment
affordances are disabled **server-side, not just in the UI**: `record_review`,
`rate_seller`, and `record_cta_click` (the tester-CTA path) each reject
`is_demo = true` posts, so a placeholder can never accrue a real review, rating,
verified/boost karma, or tester-CTA credit. (The Request button is UI-disabled to
"Example listing"; `create_request` itself is not server-blocked — a known,
low-risk residual since demo sellers are real `@ucsc.edu` seed accounts.)

## Studio + app testers (Session 13c)

- **Fulfilled-sales stat** (Studio) — as of Session 14, an **exact** count of
  the seller's sold thrift posts (`type='thrift' && status='sold'`), now that
  sold posts persist permanently. This replaces the earlier
  `seller_rating_summary`-count proxy (a rated-pickups undercount, chosen back
  when posts weren't durable). Scope: thrift's discrete one-time sales only —
  shop's `sold_out` is a stock state, not a completed-sale event, so there's no
  shop equivalent to fold in.
- **App tester cohorts:** `testers(post_id,user_id,unique)` + denormalized
  `posts.tester_count`. `join_as_tester` (app-only, `FOR UPDATE` cap race,
  `+5` cosmetic karma to the maker). Individual `testers` rows are self-read only;
  counts reach the public via `tester_count` and `betas_tested()`.
- **Join-gated feedback:** `record_app_feedback` inserts a `reviews` row only if
  a `testers` row exists for the (user, app), and writes **NO karma_ledger row**
  — apps therefore still cannot accrue verified karma or a boost (RANKING.md
  guardrail intact; `record_review` shop-only path unchanged).
- **Review replies:** `reviews.reply`/`replied_at`, written only via
  `reply_to_review()` (listing-owner-only); publicly readable with the review.
- Recognition badges are **pinned** (future early-users feature); milestone karma
  badges are OK, leaderboard-style comparisons stay cut.

## Deferred (deliberately not built)

- **Photo/image upload for listings** — planned fast-follow (Storage bucket +
  media handling). Listings currently use the category-color-block card.
- **Edit/delete own posts** — not built. `update_thrift_status` (mark sold) is
  the only post mutation available; edit/delete is a known follow-up.
- App-type (`+Ship`/Beta Board) self-serve creation — stays stubbed.
- Karma linkage for ratings (see guardrail above).
- Collusion/abuse hardening on requests beyond the 10/24h rate limit.
