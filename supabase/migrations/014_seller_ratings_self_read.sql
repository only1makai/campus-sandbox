-- Session 13b follow-up: narrow self-read policy so a buyer can read back
-- their OWN rating row (seller_ratings otherwise has RLS on with zero
-- policies — a total default-deny, even for the rater). Mirrors the
-- karma_ledger self-read fix (migration 008): a user can only ever see
-- seller_ratings rows where THEY are the rater, never another user's rating
-- or another seller's individual rows. The public aggregate
-- (seller_rating_summary) and the write path (rate_seller) are unchanged —
-- this does not widen anything else, and ratings still affect no
-- ranking/ordering anywhere (see docs/COMMERCE.md).
create policy "raters can read their own rating rows"
  on seller_ratings for select
  using (auth.uid() = rater_id);
