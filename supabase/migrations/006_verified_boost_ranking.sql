-- Session 7: verified karma drives ranking — the feature the guardrail was
-- protecting. Constants: BOOST_CAP = 10 (≈10 upvotes of weight; a single +15
-- review saturates it, so reviews cannot compound), BOOST_WINDOW_DAYS = 3
-- (hard cutoff, no gradual decay in v1).
--
-- Formula: score = upvotes + boost; ties break on recency (created_at desc) —
-- the same recency handling the previous "upvotes then recency" order implied.
--
-- boost is PER-POST: derived only from verified=true ledger rows whose
-- source_post_id is THIS post, inside the active window. An author's other
-- posts inherit nothing. Cosmetic karma (verified=false) contributes zero.
--
-- The `boosted` bool stays as a UI-facing flag, but ranking derives live from
-- the ledger + boost_expires_at — never from the possibly-stale bool.

-- ---------------------------------------------------------------------------
-- 1. boost window tracking
-- ---------------------------------------------------------------------------
alter table posts add column boost_expires_at timestamptz;

-- ---------------------------------------------------------------------------
-- 2. ranked_posts: the ONE place the score formula lives. Both surfaces
--    (Beta Board + Makers Market) query this view — no duplicated logic.
--    Owner-privileged so it can aggregate the locked karma_ledger; it exposes
--    only the capped boost number, never ledger rows.
-- ---------------------------------------------------------------------------
create view ranked_posts
with (security_invoker = off) as
select
  p.*,
  b.boost,
  p.upvotes + b.boost as score
from posts p
cross join lateral (
  select case
    when p.boost_expires_at is not null and now() < p.boost_expires_at then
      least(
        coalesce((
          select sum(k.points)::int
            from karma_ledger k
           where k.source_post_id = p.id
             and k.verified                                   -- cosmetic rows: excluded
             and k.created_at >= p.boost_expires_at - interval '3 days'
        ), 0),
        10                                                    -- BOOST_CAP
      )
    else 0
  end as boost
) b;

grant select on ranked_posts to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. record_review: verified karma now opens/extends the 3-day boost window.
--    (Same body as 003 plus the boost window update.)
-- ---------------------------------------------------------------------------
create or replace function record_review(p_post_id uuid, p_body text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_author uuid;
  v_type post_type;
begin
  if v_actor is null then
    raise exception 'auth required';
  end if;

  select author, type into v_author, v_type from posts where id = p_post_id;

  if v_author is null then
    raise exception 'post % not found', p_post_id;
  end if;
  if v_type <> 'product' then
    raise exception 'reviews are for maker posts only';
  end if;
  if v_author = v_actor then
    raise exception 'you cannot review your own shop';
  end if;

  insert into reviews (post_id, author, body)
  values (p_post_id, v_actor, p_body);

  insert into karma_ledger (user_id, actor_id, action, points, source_post_id, verified)
  values (v_author, v_actor, 'review_received', 15, p_post_id, true);

  -- verified karma opens/extends the boost window (BOOST_WINDOW_DAYS = 3)
  update posts
     set boosted = true,
         boost_expires_at = now() + interval '3 days'
   where id = p_post_id;
end;
$$;
