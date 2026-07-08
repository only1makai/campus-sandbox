-- Session 12 (A cont.): thrift mechanics + re-scoping reviews/boost to shop.
--
-- 1. posts.expires_at — thrift listings auto-expire ~21 days after creation.
--    A BEFORE INSERT trigger stamps it for thrift only (apps/shop stay null),
--    so any future create path gets the expiry for free. Sellers can end a
--    listing early via update_thrift_status(... 'sold').
-- 2. ranked_posts recreated (DROP+CREATE — a plain column add can't slot into
--    the middle of `select p.*`). Formula BYTE-IDENTICAL to migration 006;
--    the only change is p.* now also surfaces expires_at et al.
-- 3. record_review re-scoped: reviews (the only verified-karma / boost path)
--    are SHOP-ONLY. Thrift is rejected with a clear error, so thrift can never
--    accrue verified karma and therefore never gets a boost. Thrift feed
--    ordering is newest-first, full stop (handled in lib/queries, not here).

-- ---------------------------------------------------------------------------
-- 1. thrift expiry column + auto-stamp trigger
-- ---------------------------------------------------------------------------
alter table posts add column expires_at timestamptz;

comment on column posts.expires_at is
  'thrift only: listing auto-expires at this time (~21d). null for app/shop.';

create or replace function public.stamp_thrift_expiry()
returns trigger
language plpgsql
as $$
begin
  if new.type = 'thrift' and new.expires_at is null then
    new.expires_at := now() + interval '21 days';
  end if;
  return new;
end;
$$;

create trigger stamp_thrift_expiry_before_insert
  before insert on posts
  for each row execute function public.stamp_thrift_expiry();

-- ---------------------------------------------------------------------------
-- 2. ranked_posts recreated (same formula; now carries the newer post columns)
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
-- 3. record_review — SHOP-ONLY (was 'product'). Body otherwise identical to
--    migration 006 (verified +15 karma + opens/extends the 3-day boost window).
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

  -- verified karma opens/extends the boost window (BOOST_WINDOW_DAYS = 3)
  update posts
     set boosted = true,
         boost_expires_at = now() + interval '3 days'
   where id = p_post_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. thrift housekeeping: flip lapsed listings to 'expired' (cron cleanup #1).
--    The feed already hides non-available/expired thrift live; this keeps the
--    stored state tidy. Service-role / cron only — no user execute grant.
-- ---------------------------------------------------------------------------
create or replace function expire_thrift_posts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  with expired as (
    update posts
       set status = 'expired'
     where type = 'thrift'
       and status = 'available'
       and expires_at is not null
       and expires_at < now()
    returning 1
  )
  select count(*) into v_count from expired;
  return v_count;
end;
$$;

revoke execute on function expire_thrift_posts() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. seller-facing thrift status change (mark sold early / relist).
--    Author-only; limited to the thrift vocabulary. 'expired' stays
--    system-only (set by the cron job above), not settable here.
-- ---------------------------------------------------------------------------
create or replace function update_thrift_status(p_post_id uuid, p_status text)
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
  if p_status not in ('available', 'sold') then
    raise exception 'thrift status must be available or sold';
  end if;

  select author, type into v_author, v_type from posts where id = p_post_id;
  if v_author is null then
    raise exception 'post % not found', p_post_id;
  end if;
  if v_type <> 'thrift' then
    raise exception 'update_thrift_status is for thrift listings only';
  end if;
  if v_author <> v_actor then
    raise exception 'only the seller can change this listing';
  end if;

  update posts set status = p_status, status_label = initcap(p_status)
   where id = p_post_id;
end;
$$;

revoke execute on function update_thrift_status(uuid, text) from public, anon;
grant execute on function update_thrift_status(uuid, text) to authenticated;
