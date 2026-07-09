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
  The feed hides listings where `status <> 'available'` or `expires_at` has
  passed. Sellers end a listing early with `update_thrift_status(post, 'sold')`
  (author-only). Thrift `status` vocabulary: `available` / `sold` / `expired`.
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
| `/sell` | Post-creation picker (shop vs thrift, consequences in copy). **Dead-ends** at "coming soon" — self-serve post creation has no backend yet (no `posts` INSERT policy / `create_post` RPC). | — |

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

### Known gap to report (not widened here)
- **No post-creation backend** (no `posts` INSERT policy / `create_post` RPC), so
  the `/sell` picker is design-only until a create flow exists.

## Deferred (deliberately not built)

- UI for thrift feed, requests/messaging, and rating (later session).
- Karma linkage for ratings (see guardrail above).
- Collusion/abuse hardening on requests beyond the 10/24h rate limit.
