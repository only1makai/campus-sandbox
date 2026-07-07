# CAL-Links Onboarding — plugging product #2 into the shared identity

*How a second Next.js app connects to the same identity substrate. Written
2026-07-06, before CAL-Links exists. Read docs/IDENTITY.md first.*

## The one-sentence version

CAL-Links points at the **same Supabase project** Campus Sandbox uses, reads
the **same `profiles` table and reputation function**, runs the **same
@supabase/ssr session pattern**, and keeps all of its own domain data in its
own tables keyed by `profiles.id` — it never creates its own users table.

## 1. Supabase project

Same project as Campus Sandbox — ref `pqxyspnugpwzwqtcpqfu` (us-east-2).
Do **not** create a second Supabase project; the whole point is one
`auth.users` + one `profiles`.

## 2. Environment variables

Same four names Campus Sandbox uses (values from the shared project's
dashboard — see `.env.local.example`; never commit real values):

- `NEXT_PUBLIC_SUPABASE_URL` — bare project URL, no `/rest/v1/` suffix
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public reads under RLS
- `SUPABASE_SERVICE_ROLE_KEY` — server-only; seeds/admin ops. CAL-Links may
  not need it at all at first.
- `DATABASE_URL` — only for applying CAL-Links' own migrations
  (percent-encode password specials, e.g. `!` → `%21`, `$` → `%24`)

## 3. Code to reuse (conceptually)

Copy — or eventually extract as a shared package (deferred task) — these
Campus Sandbox modules, which contain zero Sandbox product logic:

- `lib/identity/` — `getCurrentUser()`, `getProfileById/ByHandle()`,
  `getReputation()`, `isUcscEmail()`, `isValidHandle()`, the `Profile` type
- `lib/supabase/server.ts` — cookie-scoped server client
- `middleware.ts` — session refresh (tolerates missing env)
- `app/auth/confirm/route.ts` + the login/signup server-action pattern from
  `app/actions/auth.ts` if CAL-Links hosts its own login screen

Auth note: on the same Supabase project, both apps share accounts — a user
who signed up on Campus Sandbox signs into CAL-Links with the same
credentials. Session cookies are per-app-domain; single sign-ON (shared
session across domains) is a **deferred task**, not configured here.

## 4. Tables: safe vs off-limits

Safe to READ (RLS public-select):
- `profiles` — the shared identity row
- `profile_reputation(uuid)` — reputation display fact (also callable anon)
- `posts`, `reviews` — public Sandbox content, read-only; useful if CAL-Links
  ever shows "what this student shipped"

Safe to WRITE:
- Nothing Sandbox-owned. CAL-Links writes only its OWN new tables (FK to
  `profiles.id`) plus the shared self-edit function
  `update_profile_identity()` (bio/avatar of the acting user).

Off-limits:
- `karma_ledger` — no direct reads or writes for anyone; Sandbox functions
  are the only writers. If CAL-Links needs to GRANT karma one day, that's a
  new platform function to design together, not an insert.
- `record_upvote` / `record_cta_click` / `record_review` — Sandbox actions.
- Never add columns to `profiles` without updating docs/IDENTITY.md and
  agreeing they're shared-generic.

## 5. RLS assumptions CAL-Links inherits

- `profiles`, `posts`, `reviews`: public SELECT, no user-writable policies —
  every write goes through `security definer` functions that derive the actor
  from `auth.uid()`.
- `karma_ledger`: locked entirely; aggregates exposed only via
  `profile_reputation()`.
- The @ucsc.edu gate lives on `auth.users` itself, so CAL-Links signups are
  automatically UCSC-gated with zero extra code.
- CAL-Links' own tables should follow the same recipe: enable RLS, public or
  authed SELECT as appropriate, writes via functions.

## 6. Deferred (do not attempt while onboarding)

Cross-domain SSO/cookie sharing · custom SMTP · domains/DNS/deployment ·
shared npm package extraction · avatar upload infra · any karma-based ranking.
