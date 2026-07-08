-- Session 12 (C): seller star ratings — Thrift/commerce credibility.
--
-- PERMANENCE vs EPHEMERALITY — the central design point:
--   A rating is permanent reputation; the request that produced it is
--   ephemeral (hard-deleted by the retention cron). So seller_ratings.request_id
--   has NO foreign key to requests. It is a plain UNIQUE uuid — a historical
--   receipt, not a live child row. When the request is deleted, the rating is
--   untouched (nothing cascades to it). UNIQUE(request_id) still guarantees at
--   most one rating per request.
--   rater_id / seller_id are DENORMALIZED copies of the request's participants,
--   captured at rating time. Their FKs to profiles mirror karma_ledger:
--   seller_id ON DELETE CASCADE (seller gone → reputation moot), rater_id ON
--   DELETE SET NULL (rater gone → seller keeps the rating, attribution lost).
--
-- GUARDRAILS:
--   * Ratings affect NO ranking/ordering anywhere — display-only credibility.
--   * Ratings write NO karma_ledger rows. Whether a rating should ever feed
--     karma is a deliberate FUTURE design decision (see docs/COMMERCE.md);
--     do not wire it here.

create table seller_ratings (
  id         uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,   -- intentionally NO FK: outlives the request
  rater_id   uuid references profiles (id) on delete set null,
  seller_id  uuid not null references profiles (id) on delete cascade,
  stars      integer not null check (stars between 1 and 5),
  created_at timestamptz not null default now()
);

create index seller_ratings_seller_idx on seller_ratings (seller_id);

comment on column seller_ratings.request_id is
  'source request (no FK — rating is permanent, the request is ephemeral)';

-- Individual rows are private (who rated whom); only the aggregate is public,
-- exactly like karma_ledger → profile_reputation. RLS on, no select policy.
alter table seller_ratings enable row level security;
-- no policies: writes via rate_seller(), reads via seller_rating_summary().

-- ---------------------------------------------------------------------------
-- rate_seller(request_id, stars): only the buyer, only when status='fulfilled',
-- exactly once (UNIQUE enforces). Self-rating is impossible — requests already
-- enforce buyer_id <> seller_id (migration 011).
-- ---------------------------------------------------------------------------
create or replace function rate_seller(p_request_id uuid, p_stars integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := auth.uid();
  v_buyer  uuid;
  v_seller uuid;
  v_status request_status;
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
  if v_actor <> v_buyer then
    raise exception 'only the buyer on this request can rate the seller';
  end if;
  if v_status <> 'fulfilled' then
    raise exception 'you can only rate the seller after the request is fulfilled';
  end if;

  insert into seller_ratings (request_id, rater_id, seller_id, stars)
  values (p_request_id, v_buyer, v_seller, p_stars);
  -- unique (request_id) surfaces a second attempt as an error to the caller
end;
$$;

revoke execute on function rate_seller(uuid, integer) from public, anon;
grant execute on function rate_seller(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- seller_rating_summary(seller_id): read-only aggregate (avg + count), the
-- ONLY public window into seller_ratings — same pattern as profile_reputation.
-- Owner-privileged so it can read the RLS-locked table; exposes no rows.
-- GUARDRAIL: display fact only, never ordering.
-- ---------------------------------------------------------------------------
create or replace function seller_rating_summary(p_seller_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_avg   numeric;
begin
  select count(*), avg(stars)
    into v_count, v_avg
    from seller_ratings
   where seller_id = p_seller_id;

  return jsonb_build_object(
    'count', v_count,
    -- null when there are no ratings; one decimal place otherwise
    'avg', case when v_count > 0 then round(v_avg, 1) else null end
  );
end;
$$;

grant execute on function seller_rating_summary(uuid) to anon, authenticated;
