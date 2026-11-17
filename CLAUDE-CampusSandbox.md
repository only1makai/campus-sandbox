# CLAUDE-CampusSandbox.md

Briefing for an autonomous coding agent working in `only1makai/campus-sandbox`. Read it fully before changing anything. `ROADMAP-CampusSandbox.md` says what to work on.

> **Provenance.** Written 17 Nov 2026 from the owner's project records, which were last updated in mid-September 2026. Anything marked **(verify)** comes from those records or is inferred, and has not been checked against the repo. The repo is the source of truth. If it disagrees with this file, trust the repo, say so in your PR, and fix this file.
>
> The repo may already contain a `CLAUDE.md` (the owner's conventions file). Read it too. If it conflicts with this file, don't pick a side silently. Flag the conflict in the PR.

---

## 1. What it is and who it's for

Campus Sandbox is a two-sided campus marketplace for UC Santa Cruz students, live at campussandbox.club. It has two halves:

- **Beta Board:** students post apps they built and recruit testers.
- **Marketplace / Thrift:** students list items (shop and thrift posts) and buy, sell, or request them.

Access is gated by verified `@ucsc.edu` identity. Users are UCSC students. The owner is Makai La Madrid, a UCSC Technology & Information Management student.

**Why this repo is being worked on now.** It is the owner's lead portfolio project for Summer 2027 analyst internship applications. The goal is evidence, not more features: instrumentation, a clean public repo, a case-study README, and a SQL analysis of real usage. Prefer work that makes the project legible and measurable over new product surface.

**The pitch is trust & safety / marketplace integrity, not "a marketplace."** Verified identity gating, social endorsement kept separate from transaction-verified reputation, and a ranking-manipulation exploit the owner found and closed (see §7). Docs and README must follow this framing.

---

## 2. Tech stack

Per the owner's records. Confirm against `package.json` and the repo **(verify)**.

- **App:** Next.js (App Router, TypeScript), with server actions for mutations
- **Backend:** Supabase (Postgres, Auth, RLS). All writes go through security-definer RPCs
- **Package manager:** pnpm
- **Scripts:** Node `.mjs` scripts using the `pg` client and `DATABASE_URL`, e.g. `scripts/env.mjs` (env loader) and an `apply-schema` script
- **Hosting:** the owner's records say Vercel, but the repo has no `vercel.json` or `.vercel`. **Unconfirmed. See Open questions in the roadmap.**
- **Shared identity:** `auth.users` and `profiles` are shared platform identity (documented in `docs/IDENTITY.md`). The owner's other product, CAL-Links, shares it.

---

## 3. Install, run, test

You have no production credentials and must not use any. Standard commands below are inferred **(verify against `package.json` scripts; `package.json` wins, update this section if they differ)**:

```bash
pnpm install
pnpm dev          # local dev server
pnpm build        # must pass before any PR
pnpm lint         # must pass before any PR
```

- **Env:** copy the env template to `.env.local` (see roadmap item 2.2; the template may not exist yet). Only `DATABASE_URL` is confirmed to exist. Never commit `.env*` files.
- **Tests:** a test command is not confirmed **(verify)**. If none exists, say so in your PR rather than inventing one.
- **Migrations:** you write them. You do not apply them to production. The owner applies them via the `apply-schema` script. Validate migration SQL by reading it carefully and, if a disposable local Postgres is available, by running it there. State in the PR which of those you did.

---

## 4. Repo structure

Known from the owner's records. Run `git ls-files` and replace this table with the real tree in your first PR **(verify)**.

| Path | What it is |
|---|---|
| `app/` | Next.js app. `app/layout.tsx` is the root layout. Server actions and feed queries (e.g. `fetchShopPosts()`) live in the app code |
| migrations (numbered `001`–`021`, plus `022` on branch `analytics-022`) | Postgres schema history. Location in repo **(verify)** |
| `scripts/` | `env.mjs`, `apply-schema` script |
| `docs/IDENTITY.md` | Shared platform identity. Lists `handle_new_user()` as shared infrastructure |
| `docs/ANALYTICS.md` | Analytics design doc. Added in migration 022's commit, on `analytics-022` |
| `COMMERCE.md` | User-facing commerce rules, including the promise that requests are hard-deleted |
| `CLAUDE.md` | The owner's conventions file (core invariants) **(verify contents)** |
| `README.md` | Still the unmodified create-next-app boilerplate as of the last record |

Core tables: `profiles`, `posts`, `requests`, `messages`, `seller_ratings`, `karma_ledger`, and (after 022) `analytics_events`.

Core RPC/functions: `create_post()`, `create_request()`, `update_request_status()`, `rate_seller()`, `join_as_tester()`, `cleanup_expired_requests()` (hourly retention cron), `handle_new_user()` (auth trigger on `auth.users`).

---

## 5. Conventions

- **RPC-only writes.** Client code never writes tables directly. Mutations go through security-definer functions. Do not add a client-callable RPC that writes analytics.
- **RLS on every table.** Internal tables (`karma_ledger`, `seller_ratings`, `analytics_events`) have RLS enabled with **zero policies**, so only the service role or SQL editor can touch them. Grants are revoked from `anon` and `authenticated`.
- **Migrations are sequential and additive.** New change = new numbered file. Never edit a migration that has been applied.
- **`text` + `CHECK`, not Postgres enums,** for evolving value sets (precedent: `karma_ledger.action`). A CHECK is a one-line migration. An enum is a type alteration.
- **No foreign key where a row must outlive its parent.** The retention cron hard-deletes requests, so history tables that reference them (`seller_ratings.request_id`, `analytics_events.subject_id`) have no FK. Actor references use `on delete set null`.
- **Append-only logs** (`karma_ledger`, `analytics_events`) are never cron-deleted or edited.
- **Small PRs.** One roadmap item per PR. Commit incrementally.
- **Plain, direct prose** in docs and README. No marketing filler. The owner wants his own voice and dislikes AI-sounding writing. Draft plainly and flag voice for his edit.

---

## 6. Core invariants

1. **Posts are never deleted.** No cron, job, or RPC deletes a `posts` row. Sold thrift is permanent sales history. Hide or expire posts by status. Never add a delete path.
2. **`handle_new_user()` is shared identity and is not touched** for Sandbox-specific work.
3. **Request messages are ephemeral.** The retention cron (`cleanup_expired_requests()`, migration 013) hard-deletes requests that are fulfilled/declined for more than 48h or idle for more than 14 days, cascading to messages. This is deliberate. Do not change what it deletes or when.

---

## 7. Decisions already made (and why)

Don't relitigate these. If you think one is wrong, say so in a PR comment and keep following it.

| Decision | Why |
|---|---|
| Pitch the project as trust & safety / marketplace integrity | Maps to how Uber, DoorDash, Airbnb and Etsy describe T&S/marketplace-ops internships, and it is the project's real strength |
| Boost ceiling of 30 days | The owner found a ranking-manipulation exploit in shipped code: a small friend group could game boosts via mutual reviewing. The ceiling closes it without removing the feature |
| Endorsement kept separate from transaction-verified reputation | A trust signal should not be fakeable by social ties alone |
| Posts never deleted; hide by status | The invariant is itself a portfolio artifact. A delete path would contradict the stated principles |
| Analytics emitted **inside existing security-definer functions** via an internal `log_event()` helper, revoked from `public`, `anon`, `authenticated` | Events are unforgeable and transactionally consistent with the action. A client-callable logger would allow fake events and drift. Adds zero new client-facing RPC surface |
| Each emit wrapped in `begin … exception when others then null; end;` | Analytics must never break a user action. Silent event loss is the accepted tradeoff |
| Nine events: `signup`, `listing_created`, `listing_sold`, `request_sent`, `request_fulfilled`, `request_declined`, `request_expired`, `rating_left`, `beta_board_join` | Declined/expired give the request funnel a denominator, and sold gives thrift sell-through |
| `actor_id` kept on request events | Enables cohort and repeat-buyer analysis. Narrows the "requests are ephemeral" promise, so it must be disclosed in `COMMERCE.md`. Cron-driven events have `actor_id` null, with both party ids in `props` |
| `analytics_events` has no FK on `subject_id` / `request_id` | The cron deletes requests, and an FK would cascade away the analytics or block the cron |
| Signup event uses a **separate trigger on `profiles`** (`log_signup_event()`), not code inside `handle_new_user()` | Keeps shared identity untouched and the analytics droppable |
| No `is_demo` column. Test traffic is excluded **by handle at query time** | A column is gold-plating. The real risk is forgetting the filter, so the exclusion clause lives in `docs/ANALYTICS.md`. The doc carries the twelve seed handles from migration 016 |
| Upvotes, CTA clicks, and reviews are **not** logged in `analytics_events` | `karma_ledger` already records them. Duplicating creates two sources of truth. UNION at query time |
| Vercel Analytics is complementary, not a replacement | It covers anonymous top-of-funnel. `analytics_events` covers authenticated behavior |
| Case study uses real data only, collected over roughly 4–6 weeks after 022 reaches production | Request rows are destroyed by the cron, so the funnel cannot be reconstructed later |

---

## 8. Never do

- **Never commit secrets.** No API keys, tokens, `.env*` files, `DATABASE_URL` values, service-role keys, or real Supabase project credentials. If you find one already committed, stop, report it with file and commit, and do not rewrite history.
- **Never push to `main`.** Branch, open a PR, and let the owner merge. No force-pushes anywhere. No history rewrites without explicit owner approval.
- **Never change licensing.** Don't add, remove, or edit a `LICENSE` file or license fields in `package.json`. It's the owner's call (see Open questions).
- **Never delete data.** No `DELETE`, `DROP`, or `TRUNCATE`, no destructive migrations, no deleting `posts` rows, no edits to the retention cron's deletion logic except under an approved roadmap item. Changes must be additive.
- **Never touch production.** Don't apply migrations to production or run SQL against it. Don't ask for production credentials. Write the migration and hand it to the owner.
- **Never modify `handle_new_user()`** or other shared-identity objects.
- **Never put PII or message content in `analytics_events.props`.** No emails, no message bodies.
- **Never invent numbers.** Every metric in the README or case study must come from a query run on real data, with the raw output attached to the PR.
- **Never claim something works without raw evidence.** Earlier agent sessions on this owner's projects have reported false test counts and nonexistent harnesses. Paste actual command output. If you couldn't run something, say so plainly.

---

## 9. How to work

1. Start with the first unchecked item in `ROADMAP-CampusSandbox.md` that isn't blocked on the owner.
2. One item per PR. The PR description states what changed, how you verified it (raw output), and anything you couldn't verify.
3. Where the roadmap says **[owner]**, don't do it. Prepare what the owner needs and stop.
4. Where something is under **Open questions**, don't guess. Leave a PR comment asking.
5. If a task would break §6 or §8, stop and ask.
