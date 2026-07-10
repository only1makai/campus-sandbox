-- Session 13e: (A) demo-post labeling + (B) 30-day boost ceiling.
--
-- A. is_demo flags seeded placeholder posts. New create_post rows default to
--    false (untouched). record_review / rate_seller / record_cta_click reject
--    demo posts server-side so a placeholder can never accrue real karma,
--    reviews, ratings, or tester-CTA credit.
-- B. record_review caps a post's boost window at 30 days from FIRST boost, so
--    endless review-extension (the RANKING.md collusion vector) is bounded.

-- ---------------------------------------------------------------------------
-- 1. columns
-- ---------------------------------------------------------------------------
alter table posts add column is_demo boolean not null default false;
alter table posts add column boost_first_started_at timestamptz;

comment on column posts.is_demo is
  'seeded placeholder/example post — cannot accrue real karma/reviews/ratings.';
comment on column posts.boost_first_started_at is
  'when this post was FIRST boosted (null = never). Caps boost_expires_at at first+30d.';

-- ---------------------------------------------------------------------------
-- 2. backfill: only the 12 seed authors (fixtures). Real user posts (e.g. the
--    thrift "ps5" listing) stay is_demo = false.
-- ---------------------------------------------------------------------------
update posts
   set is_demo = true
 where author in (
   select id from profiles
    where handle in (
      'mayabuilds','kenzo.dev','priya.ships','ossslug','dorm.dev','mossgirl',
      'petalpress','mudslinger','stickyslug','foldedpine','waxpoetic','hookedslug'
    )
 );

-- ---------------------------------------------------------------------------
-- 3. recreate ranked_posts so `select p.*` surfaces is_demo/boost_first_started_at.
--    Formula BYTE-IDENTICAL to migration 010 (BOOST_CAP 10, 3-day window).
-- ---------------------------------------------------------------------------
drop view if exists ranked_posts;

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
             and k.verified
             and k.created_at >= p.boost_expires_at - interval '3 days'
        ), 0),
        10
      )
    else 0
  end as boost
) b;

grant select on ranked_posts to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. record_review: + is_demo rejection, + 30-day boost ceiling. All existing
--    gates (shop-only, not-own, one-per-user via reviews unique key) unchanged.
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
  v_is_demo boolean;
begin
  if v_actor is null then
    raise exception 'auth required';
  end if;

  select author, type, is_demo into v_author, v_type, v_is_demo from posts where id = p_post_id;

  if v_author is null then
    raise exception 'post % not found', p_post_id;
  end if;
  if v_is_demo then
    raise exception 'this is an example listing — reviews are disabled on demo posts';
  end if;
  if v_type <> 'shop' then
    raise exception 'reviews are for shop (marketplace) posts only — thrift listings cannot be reviewed';
  end if;
  if v_author = v_actor then
    raise exception 'you cannot review your own shop';
  end if;

  insert into reviews (post_id, author, body)
  values (p_post_id, v_actor, p_body);

  insert into karma_ledger (user_id, actor_id, action, points, source_post_id, verified)
  values (v_author, v_actor, 'review_received', 15, p_post_id, true);

  -- verified karma opens/extends the boost window (BOOST_WINDOW_DAYS = 3),
  -- capped at 30 days from the FIRST boost. Both refs read the pre-update
  -- boost_first_started_at, so first review → now()+3d, later ones extend up to
  -- first+30d, and a review past the ceiling sets an already-past expiry
  -- (karma still paid; no live boost granted).
  update posts
     set boosted = true,
         boost_first_started_at = coalesce(boost_first_started_at, now()),
         boost_expires_at = least(
           now() + interval '3 days',
           coalesce(boost_first_started_at, now()) + interval '30 days'
         )
   where id = p_post_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. rate_seller: + is_demo rejection (lookup via the request's post). All
--    other gates (buyer-only, fulfilled-only, once via UNIQUE) unchanged.
-- ---------------------------------------------------------------------------
create or replace function rate_seller(p_request_id uuid, p_stars integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid := auth.uid();
  v_buyer   uuid;
  v_seller  uuid;
  v_status  request_status;
  v_is_demo boolean;
begin
  if v_actor is null then
    raise exception 'auth required';
  end if;
  if p_stars < 1 or p_stars > 5 then
    raise exception 'stars must be between 1 and 5';
  end if;

  select buyer_id, seller_id, status
    into v_buyer, v_seller, v_status
    from requests where id = p_request_id;
  if v_buyer is null then
    raise exception 'request % not found', p_request_id;
  end if;

  select p.is_demo into v_is_demo
    from posts p join requests r on r.post_id = p.id
   where r.id = p_request_id;
  if v_is_demo then
    raise exception 'this is an example listing — ratings are disabled on demo posts';
  end if;

  if v_actor <> v_buyer then
    raise exception 'only the buyer on this request can rate the seller';
  end if;
  if v_status <> 'fulfilled' then
    raise exception 'you can only rate the seller after the request is fulfilled';
  end if;

  insert into seller_ratings (request_id, rater_id, seller_id, stars)
  values (p_request_id, v_buyer, v_seller, p_stars);
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. record_cta_click: + is_demo rejection (the "join as tester" path). Insert
--    unchanged (cosmetic +5, verified defaults false).
-- ---------------------------------------------------------------------------
create or replace function record_cta_click(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_author uuid;
  v_is_demo boolean;
begin
  if v_actor is null then
    raise exception 'auth required';
  end if;

  select author, is_demo into v_author, v_is_demo from posts where id = p_post_id;

  if v_author is null then
    raise exception 'post % not found', p_post_id;
  end if;
  if v_is_demo then
    raise exception 'this is an example app — actions are disabled on demo posts';
  end if;

  insert into karma_ledger (user_id, actor_id, action, points, source_post_id)
  values (v_author, v_actor, 'cta_click', 5, p_post_id);
end;
$$;
