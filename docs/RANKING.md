# Ranking — verified-karma boost (Session 7)

## The formula (lives in ONE place: the `ranked_posts` view)

```
score = upvotes + boost          -- ties break on created_at desc (recency)

boost = 0                          when no active window
      = min(Σ verified points on THIS post within the window, BOOST_CAP)
```

- **BOOST_CAP = 10** — "ten upvotes worth" of weight. A single review (+15
  verified) already saturates the cap, so stacking reviews cannot compound
  the boost, and a boosted post can never leapfrog anything more than 10
  organic upvotes ahead of it.
- **BOOST_WINDOW_DAYS = 3** — each verified karma event sets
  `posts.boost_expires_at = now() + 3 days` (later events extend it). Hard
  cutoff at expiry; no gradual decay in v1.
- **Per-post only**: boost derives from `karma_ledger` rows whose
  `source_post_id` is this post. An author's other posts inherit nothing.
- **Cosmetic karma** (`verified = false`: upvote +1 ledger rows, CTA +5) is
  excluded by the `k.verified` predicate — regression-tested live on
  2026-07-06 (a +5 CTA event produced byte-identical ordering).
- The `boosted` bool is UI-legacy; ranking and the badge both derive from the
  ledger + `boost_expires_at`, never the bool.
- Both surfaces (Beta Board, Makers Market) query `ranked_posts` — no
  duplicated formula. In practice only `shop` posts can boost today, because
  reviews are the only verified-karma action and they are shop-only (Session
  12 re-scoped them from `product`; thrift can never boost). See `COMMERCE.md`.

## KNOWN LIMITATION — collusion (deliberately deferred, NOT solved)

Two users can trade reviews to boost each other, and because reviews are
one-per-user-per-post, a small ring of accounts can keep each other's posts
boosted more or less permanently (each new reviewer extends the 3-day
window). The cap limits the damage to +10 score per post, but the vector is
real and unhandled.

Sketch of a real fix (future session, do not build piecemeal):
- **Pair rate-limiting**: at most one verified-karma event per
  (actor, recipient) pair per N days, enforced in `record_review()` — cheap
  first step.
- **Reviewer diversity**: boost only counts verified events from ≥K distinct
  reviewers, or weight each reviewer's Nth review of the same maker at 1/N.
- **Reciprocity damping**: down-weight A→B karma when B→A karma exists within
  a window.
- Ledger already stores actor + recipient + timestamps, so all of the above
  are query-time policies — no schema change expected.

## Verification record (2026-07-06, live)

Baseline market: 58 / 45 / 41 / 34 / 27 / 22 / 5 (all boost 0). One review on
Loop Threads (22 upvotes) → boost 10, score 32: moved above Redwood Reads
(27), stayed below Slug & Stem (34) and everything higher — cap respected.
Same-author "Scarf Run" post: boost 0. Badge rendered "BOOSTED · 3d left";
forcing `boost_expires_at` into the past dropped boost to 0, reverted
ordering, and removed the badge; restoring the genuine window restored
boost 10/score 32.
