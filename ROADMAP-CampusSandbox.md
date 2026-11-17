# ROADMAP-CampusSandbox.md

Plan for `only1makai/campus-sandbox`, from the current state to done. Read `CLAUDE-CampusSandbox.md` first. It has the rules, decisions, and never-do list.

> **State as of 17 Nov 2026**, built from records last updated mid-September 2026. The first item below is verifying what has changed since. Don't assume anything marked open is still open.

**Tags:** `[agent]` = you do it in one PR. `[owner]` = the owner does it, prepare and stop. `[blocked]` = waiting on an open question or on data.

## Definition of done

1. Migration 022 is live in production and has been collecting events for at least 4 weeks.
2. The repo is public, with a clean secrets audit of the working tree and full history.
3. The test listing is hidden, with no delete path added.
4. The README is a case study, not boilerplate.
5. A SQL case study built from real, test-excluded production data is written up.

**Why the order matters:** `cleanup_expired_requests()` runs hourly and permanently destroys request funnel data. Every day 022 isn't in production is request data that can never be recovered. Phase 1 comes first because of this.

---

## Done

- [x] Live at campussandbox.club with a real non-founder user completing a real transaction
- [x] Migrations `001`–`021`, RPC-only writes, adversarial testing
- [x] Ranking-manipulation exploit found and closed with a 30-day boost ceiling
- [x] Migration 022 designed and written. It adds `analytics_events` (RLS on, zero policies), an internal `log_event()` helper (execute revoked), the nine event call sites, and a separate `log_signup_event()` trigger on `profiles`. It is committed on branch `analytics-022` at `11db4b7`, with `docs/ANALYTICS.md`.
- [x] Per the earlier agent session's report, 022 was applied inside a transaction against production, a full lifecycle was run (all nine events produced the expected rows, `handle_new_user()` unchanged, the UCSC email gate still rejected non-UCSC addresses), and it was rolled back. Raw output was not captured, so treat this as unverified until Phase 1 evidence exists.

---

## Phase 1: Land the instrumentation (most important)

- [ ] **1.1 `[agent]` Verify state, then open the PR for `analytics-022` → `main`.**
  - First, paste raw output of `git log --oneline -15`, `git branch -a`, and whether `11db4b7` is reachable from `main`.
  - If 022 is already merged, check this off, say so, and skip to 1.2.
  - Acceptance: PR is rebased cleanly onto `main` with no code changes beyond the rebase. The description lists the nine events and what was verified, with raw evidence. `pnpm build` and `pnpm lint` output is attached.

- [ ] **1.2 `[agent]` Retention cron: per-row event logging (proposal PR, do not merge).**
  - The cron currently logs its batch under one exception block, so one logging failure drops the whole batch's `request_declined` / `request_expired` events. The owner wants to see the diff before deciding.
  - Acceptance: each row's emit is wrapped individually. The diff shows the deletion logic unchanged. The PR describes how much the loop got more complex. PR is labeled "owner decision pending." If a disposable Postgres is available, show a forced failure on one row not dropping the others. Otherwise say it was not tested.

- [ ] **1.3 `[agent]` `COMMERCE.md` disclosure line.** Check whether 022's commit already includes one. The record says it touched only two new files, so likely not.
  - Acceptance: one added line stating that request metadata (not message content) is retained in an internal analytics log after requests expire. The wording matches `docs/ANALYTICS.md`. No other `COMMERCE.md` changes.

- [ ] **1.4 `[agent]` `[blocked: Q4]` Correct the test-handle exclusion list in `docs/ANALYTICS.md`.** The earlier list included `@him` and `@sammy.tests` as guesses.
  - Acceptance: only owner-supplied handles are listed. The twelve migration-016 seed handles stay. The exclusion clause is a copy-pasteable `WHERE` fragment.

- [ ] **1.5 `[owner]` Review the full 022 diff, merge, and apply to production.**
  - Owner verifies: table exists, RLS on with zero policies, `anon` / `authenticated` have no grants and no execute on `log_event()`, and one real action produces one event row.

- [ ] **1.6 `[agent]` `[blocked: 1.5]` Record the data-window start date** in `docs/ANALYTICS.md` once the owner supplies the apply date.
  - Acceptance: a single dated line. The earliest case-study date (start + 4 weeks) is stated.

## Phase 2: Make the repo safe to make public

- [x] **2.1 `[agent]` Secrets audit of the working tree and full git history.** Done 2026-11-17, clean. Used detect-secrets instead of gitleaks/trufflehog; see `docs/SECURITY-AUDIT.md`.
  - Acceptance: scanner output (gitleaks or trufflehog) pasted raw and unedited in the PR. Result is zero findings, or each finding is listed with file, commit, and a rotate-this note for the owner. No history rewrite. `.env*` ignored, shown by `git check-ignore -v .env.local`.

- [ ] **2.2 `[agent]` `.env.example` with variable names only.**
  - Acceptance: every env var the code reads is listed, with grep output as evidence. All values blank or obvious placeholders. No real hostnames or project refs.

- [ ] **2.3 `[agent]` `[blocked: Q5]` Hide the test listing via a status, no delete path (migration `023`).** The listing is "Makai Test Kicks — Air Slugs": type `shop`, status `in_stock`, author `@him`, created 2026-07-14. `fetchShopPosts()` has no status filter today.
  - Acceptance: additive migration adds `'hidden'` to the `posts` status `CHECK`. `fetchShopPosts()` excludes `hidden`. No `DELETE`, no new column, no `is_demo`. The one-row `UPDATE` appears as a clearly labeled snippet in the PR for the owner to run, not executed. The "posts are never deleted" invariant text is updated only to mention the hidden status.

- [ ] **2.4 `[owner]` Decide on a license (Q8).** The agent adds nothing until told.

- [ ] **2.5 `[owner]` `[blocked: 2.1 clean]` Make the repo public.**

## Phase 3: Recruiter-readable

- [ ] **3.1 `[agent]` Reconcile the repo's existing `CLAUDE.md` with `CLAUDE-CampusSandbox.md`.**
  - Acceptance: a PR comment lists every conflict between the two. No silent overwrite. Owner picks the winners.

- [ ] **3.2 `[agent]` Rewrite `README.md` as a case study.**
  - Acceptance: replaces the create-next-app boilerplate. Sections are problem, who it's for, decisions, tradeoffs, and what I'd change. It leads with trust & safety. It tells the ranking-manipulation exploit and the 30-day ceiling accurately, citing the migration or file. Every claim traces to code, and no number appears that wasn't owner-supplied or queried. Plain voice, no filler. Marked as a draft for the owner's voice edit.

- [ ] **3.3 `[agent]` Verify the README's run instructions from a clean clone.**
  - Acceptance: commands copy-pasted with raw output. Steps that need owner secrets are named, not worked around.

- [ ] **3.4 `[agent]` One-page architecture doc with a Mermaid diagram** of the request lifecycle and event emission.
  - Acceptance: matches the migrations. Shows the retention cron and why `analytics_events` is the durable shadow of the ephemeral request system.

## Phase 4: Top-of-funnel analytics

- [ ] **4.1 `[agent]` `[blocked: Q1]` Add Vercel Analytics.** Only if the app is confirmed on Vercel.
  - Acceptance: `@vercel/analytics` added, `<Analytics />` in `app/layout.tsx`, no other layout changes, `pnpm build` output attached. The PR notes that retention depends on the owner's Vercel plan.

## Phase 5: Evidence

- [ ] **5.1 `[agent]` Read-only SQL query pack in `docs/analytics-queries/`.** Can be written before data exists.
  - Questions covered: signups per week, activation (signup → first listing) and time-to-first-listing, category and price mix, % of listings with at least one request (liquidity), request → fulfilled / declined / expired rates, hours-open and messages per deal, % of fulfilled deals rated, thrift sell-through and time-to-sale, beta-board fill rate.
  - Acceptance: one question per file. Each has a header comment with the question, the test-handle exclusion clause, and caveats. `SELECT` only. Stated whether each was run against an empty schema or a seeded copy.

- [ ] **5.2 `[agent]` `[blocked: ≥4 weeks of data]` Draft `docs/CASE-STUDY.md`** from raw query output the owner supplies.
  - Acceptance: every number traces to a query file plus pasted raw output. Test traffic excluded, with the clause shown. Date range and sample size stated. A limitations section covers the small user base, owner traffic excluded by handle, and request data before 022 being unrecoverable.

- [ ] **5.3 `[owner]` Recruit real users.** Real usage matters more than any feature, and the platform has repeatedly been ahead of its user base.

---

## Open questions

Don't guess these. Ask in a PR comment.

1. **Q1: Where does campussandbox.club run?** The owner's records list Vercel, but the repo has no `vercel.json` or `.vercel` and the owner said there is no Vercel project ID. Blocks 4.1.
2. **Q2: Has 022 been merged and applied to production, and on what date?** The last record (mid-September) says no. This sets the case-study date.
3. **Q3: Per-row cron logging (1.2): keep or drop?** Pending the owner's read of the diff.
4. **Q4: What are the real test and demo handles?** The doc's `@him` and `@sammy.tests` were guesses.
5. **Q5: Confirm hidden status (not `is_demo`, not a delete) for the test listing.** Has it already been hidden or removed?
6. **Q6: Does 022 already include the `COMMERCE.md` line?**
7. **Q7: Is there a test suite or CI?** What are the commands? Is a disposable local Postgres available for validating migrations?
8. **Q8: License.** None is known. The owner decides.
9. **Q9: Exact repo name.** This file uses `only1makai/CampusSandbox`, while the local clone folder is `campus-sandbox`. Confirm which is right.
10. **Q10: Package manager and full env var list.** pnpm is inferred from one command. Only `DATABASE_URL` is confirmed.
11. **Q11: Where do migrations live in the repo, and what does the existing `CLAUDE.md` say?** Needed to finish the structure table.
