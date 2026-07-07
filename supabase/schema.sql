-- Campus Sandbox — shared identity schema (v2: applied live in Session 2).
--
-- `profiles` is the SHARED identity table: one row per verified student,
-- keyed to Supabase auth (auth.uid()). CAL-Links and future surfaces join
-- against profiles — there is deliberately NO standalone `users` table.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles: shared student identity
-- ---------------------------------------------------------------------------
create table profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  handle       text not null unique check (handle ~ '^[a-z0-9._-]{2,32}$'),
  display_name text not null,
  campus       text not null default 'ucsc',
  verified     boolean not null default false,
  avatar_color text not null default 'gold',  -- flat fill token, never a gradient
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- posts: one table for both surfaces, discriminated by `type`
--   'app'     → Beta Board
--   'product' → Makers Market (later session)
-- ---------------------------------------------------------------------------
create type post_type as enum ('app', 'product');

create table posts (
  id           uuid primary key default gen_random_uuid(),
  type         post_type not null,
  author       uuid not null references profiles (id) on delete cascade,
  title        text not null,
  description  text not null,
  upvotes      integer not null default 0,
  -- app-only fields (null for products)
  platform     text check (platform in ('ios', 'web')),
  status       text,          -- 'shipped_weekend' | 'needs_testers' | 'beta_full' | 'live'
  status_label text,          -- pill copy, e.g. "Needs 12 testers"
  cta_label    text,
  cta_url      text,
  banner_color text,          -- flat fill token name, never a gradient
  testers_needed integer,
  boosted      boolean not null default false,  -- static badge; ranking comes later
  tags         text[] not null default '{}',    -- filter chips
  created_at   timestamptz not null default now()
);

create index posts_type_created_idx on posts (type, created_at desc);
create index posts_author_idx on posts (author);

-- ---------------------------------------------------------------------------
-- karma_ledger: append-only record of karma-earning actions.
--
-- GUARDRAIL: karma is recorded but NOT consumed by feed ranking. The
-- +5-per-click rule is trivially farmable (self-boosting on day one), so
-- feed ordering stays on upvotes/recency until weighting is abuse-resistant.
-- `verified` marks events that survived abuse review.
-- ---------------------------------------------------------------------------
create table karma_ledger (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profiles (id) on delete cascade,
  action         text not null,   -- 'upvote_received' | 'cta_click' | 'post_shipped'
  points         integer not null,
  source_post_id uuid references posts (id) on delete set null,
  verified       boolean not null default false,
  created_at     timestamptz not null default now()
);

create index karma_ledger_user_idx on karma_ledger (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- karma write paths: single atomic function per action. Points accrue to the
-- POST AUTHOR (there is no visitor auth yet). Called only by the server with
-- the service-role key — no anon/authenticated execute grants.
-- ---------------------------------------------------------------------------
create or replace function record_upvote(p_post_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
  v_upvotes integer;
begin
  update posts
     set upvotes = upvotes + 1
   where id = p_post_id
   returning author, upvotes into v_author, v_upvotes;

  if v_author is null then
    raise exception 'post % not found', p_post_id;
  end if;

  insert into karma_ledger (user_id, action, points, source_post_id)
  values (v_author, 'upvote_received', 1, p_post_id);

  return v_upvotes;
end;
$$;

create or replace function record_cta_click(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
begin
  select author into v_author from posts where id = p_post_id;

  if v_author is null then
    raise exception 'post % not found', p_post_id;
  end if;

  insert into karma_ledger (user_id, action, points, source_post_id)
  values (v_author, 'cta_click', 5, p_post_id);
end;
$$;

revoke execute on function record_upvote(uuid) from public, anon, authenticated;
revoke execute on function record_cta_click(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS: public read on the board; all writes go through the service role
-- (which bypasses RLS). karma_ledger has no anon surface at all.
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;
alter table posts enable row level security;
alter table karma_ledger enable row level security;

create policy "profiles are publicly readable"
  on profiles for select using (true);

create policy "posts are publicly readable"
  on posts for select using (true);

-- karma_ledger: deliberately no policies — service role only.
