# Identity Boundary — Campus Sandbox as a shared-identity platform

*Audited live against the Supabase project on 2026-07-06. This is the source
of truth for what CAL-Links (product #2) may and may not touch.*

## The model in one paragraph

Supabase Auth (`auth.users`) plus the `profiles` table are the **shared
platform identity substrate**. Everything else in the database is **owned by
Campus Sandbox** (the product), keyed to identity by `profiles.id` foreign
keys. A profile is created by a DB trigger the moment an auth user is created;
there is deliberately no product-private "users" table anywhere, and there
must never be one.

## SHARED — platform identity (CAL-Links reads/joins these)

| Object | Role |
|---|---|
| `auth.users` | Supabase-managed accounts. Gated: a `BEFORE INSERT` trigger rejects any email not ending `@ucsc.edu` — platform-wide, applies to every product and to direct API calls. |
| `profiles` | One row per person, `id = auth.uid()`. Public read (RLS). The cross-product join point. |
| `profile_reputation(uuid)` | Read-only reputation aggregates (see below). Executable by `anon` — a public display fact. |
| `update_profile_identity(text, text)` | Self-service edit of `bio` / `avatar_image_url` only. `authenticated` only. |
| Signup triggers | `handle_new_user` (creates the profile, resolves handle collisions), `handle_user_confirmed` (flips `verified`), `auth_gate_ucsc` (the email gate). |

### `profiles` column classification

| Column | Class | Notes |
|---|---|---|
| `id` | shared-generic | `= auth.uid()`, PK, FK to `auth.users` (cascade). |
| `handle` | shared-generic | **Permanent platform identifier** — see below. |
| `display_name` | shared-generic | Free text. |
| `campus` | shared-generic | Defaults `'ucsc'`; ready for multi-campus later. |
| `verified` | shared-generic | Means "confirmed @ucsc.edu mailbox". Set by triggers; robust to the confirm-email dashboard setting being on **or** off. |
| `avatar_color` | shared-generic, **⚑ flagged** | The column is generic, but its *value vocabulary* (`gold`, `live-green`, `link-blue`, `tomato`, `grape`) is the Sandbox design palette. CAL-Links either adopts these tokens or maps them. Not moved — awaiting Makai's call. |
| `avatar_image_url` | shared-generic | Nullable; `avatar_color` is the render fallback. No upload infra yet (future task). |
| `bio` | shared-generic | ≤ 280 chars. |
| `created_at` | shared-generic | |

**Flagged product-specific data on profiles: only the `avatar_color`
vocabulary (above).** No karma totals, badges, or post counts live on the
profile row — reputation is *derived* from the ledger at read time, which is
exactly why the shared row stays clean.

## SANDBOX-OWNED (CAL-Links must not write; direct reads mostly blocked)

| Object | Notes |
|---|---|
| `posts` (+ `post_type` enum) | Board apps + market products. Public read; writes via Sandbox server code only. |
| `karma_ledger` | Append-only. **No RLS read policy at all** — the only public window into it is `profile_reputation()`. `verified` column distinguishes verified karma (reviews, +15) from cosmetic (upvotes +1, CTA clicks +5). |
| `reviews` | Public read; writes only via `record_review()`. |
| `record_upvote` / `record_cta_click` / `record_review` | `authenticated`-only, derive the actor from `auth.uid()`. |

## Handles are permanent platform identifiers

- **Uniqueness is DB-enforced** (verified live): `UNIQUE (handle)` plus a
  format `CHECK (^[a-z0-9._-]{2,32}$)`. One handle ↔ one profile, forever.
- **Immutable to users** (verified live): `profiles` has a single RLS policy —
  public SELECT. No user-reachable write path touches `handle`
  (`update_profile_identity` edits bio/avatar only).
- CAL-Links should treat `@handle` as the stable public identifier and
  `profiles.id` as the stable internal key.
- **If a handle-rename feature is ever wanted**, it needs a deliberate design
  (old-handle alias table + redirects, cross-product cache invalidation) —
  proposed as a future task, not silently changed here.

## Cross-product reputation (read-only)

`profile_reputation(profile_id)` returns
`{ total_karma, verified_karma, cosmetic_karma, badges[] }`, aggregated from
`karma_ledger` at call time. Badges today: `karma-earner` (>0),
`slug-50` (≥50), `verified-contributor` (≥15 verified).

**GUARDRAIL (unchanged since Session 1):** reputation is a *display* fact.
It does not — and must not — feed feed/market ordering in any product.
Ordering everywhere is upvotes desc, then recency. Ranking that consumes
verified karma is a future, deliberate session.

## The code seam

`lib/identity/` is the module CAL-Links conceptually reuses:
`getCurrentUser()`, `getProfileById/ByHandle()`, `getReputation()`,
`isUcscEmail()`, `isValidHandle()`, `toProfile()`. It imports no Sandbox
concepts (no posts, karma actions, or reviews) — only the generic Supabase
server client. Sandbox features import *from* it, never the reverse.

## Deferred future tasks (deliberately not done)

- Avatar upload infrastructure (today: URL field only).
- Handle-rename/alias strategy.
- Extracting `lib/identity/` into a shared package once CAL-Links exists.
- Cross-domain session/SSO configuration, SMTP, deployment.
- Any ranking use of verified karma.
