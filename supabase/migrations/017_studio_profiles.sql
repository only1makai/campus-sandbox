-- Session 13c: Studio + profile realignment schema.
--   * app tester cohorts (testers table + denormalized posts.tester_count) and
--     join-gated app feedback (record_app_feedback — a reviews row, NO karma, so
--     apps still cannot boost: RANKING.md guardrail intact).
--   * maker reply on a review (reviews.reply/replied_at, owner-only write).
--   * app editable fields (version/changelog/tester_goal/max_testers).
--   * profiles gains generic identity fields (college_year/pronouns/links);
--     update_profile_identity extended. profiles RLS + handle/verified/campus
--     untouched (IDENTITY.md).

-- ---------------------------------------------------------------------------
-- 1. columns
-- ---------------------------------------------------------------------------
alter table posts add column tester_goal  integer;
alter table posts add column max_testers  integer;
alter table posts add column version      text;
alter table posts add column changelog    text;
alter table posts add column tester_count integer not null default 0;

-- app-only maker fields (tester_count stays 0 on shop/thrift, harmless)
alter table posts add constraint posts_app_only_fields check (
  (tester_goal is null and max_testers is null and version is null and changelog is null)
  or type = 'app'
);

alter table profiles add column college_year  text check (college_year is null or char_length(college_year) <= 60);
alter table profiles add column pronouns      text check (pronouns is null or char_length(pronouns) <= 40);
alter table profiles add column github_url    text check (github_url is null or github_url ~* '^https?://');
alter table profiles add column website_url   text check (website_url is null or website_url ~* '^https?://');
alter table profiles add column contact_email text check (contact_email is null or contact_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');

alter table reviews add column reply      text check (reply is null or char_length(reply) between 1 and 500);
alter table reviews add column replied_at timestamptz;

-- ---------------------------------------------------------------------------
-- 2. testers — app beta membership. Public read is NOT granted; a user reads
--    only their OWN join rows (to know "have I joined"). Counts reach the public
--    via posts.tester_count (denormalized) and betas_tested() (aggregate).
-- ---------------------------------------------------------------------------
create table testers (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references posts (id) on delete cascade,
  user_id    uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);
create index testers_post_idx on testers (post_id);
create index testers_user_idx on testers (user_id, created_at desc);

alter table testers enable row level security;
create policy "testers can read their own join rows"
  on testers for select using (auth.uid() = user_id);
-- no insert/update/delete policies: writes via join_as_tester()

-- ---------------------------------------------------------------------------
-- 3. recreate ranked_posts so `select p.*` surfaces the new posts columns.
--    Formula BYTE-IDENTICAL to migration 016 (BOOST_CAP 10, 3-day window).
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
-- 4. join_as_tester — app-only beta join. FOR UPDATE serializes the cap race.
-- ---------------------------------------------------------------------------
create or replace function join_as_tester(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid := auth.uid();
  v_author  uuid;
  v_type    post_type;
  v_is_demo boolean;
  v_max     integer;
  v_count   integer;
begin
  if v_actor is null then
    raise exception 'auth required';
  end if;

  -- lock the post row so two simultaneous joins can't both pass the cap check
  select author, type, is_demo, max_testers, tester_count
    into v_author, v_type, v_is_demo, v_max, v_count
    from posts where id = p_post_id
    for update;

  if v_author is null then
    raise exception 'post % not found', p_post_id;
  end if;
  if v_type <> 'app' then
    raise exception 'only Beta Board apps can be tested';
  end if;
  if v_is_demo then
    raise exception 'this is an example app — joining is disabled on demo posts';
  end if;
  if v_author = v_actor then
    raise exception 'you cannot join your own app as a tester';
  end if;
  if v_max is not null and v_count >= v_max then
    raise exception 'this beta is full';
  end if;

  insert into testers (post_id, user_id) values (p_post_id, v_actor);
  -- unique (post_id, user_id) surfaces a repeat as a duplicate error

  update posts set tester_count = tester_count + 1 where id = p_post_id;

  insert into karma_ledger (user_id, actor_id, action, points, source_post_id, verified)
  values (v_author, v_actor, 'tester_joined', 5, p_post_id, false);
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. record_app_feedback — join-gated feedback on an app. Inserts a reviews row
--    but writes NO karma_ledger row, so apps never accrue verified karma/boost.
-- ---------------------------------------------------------------------------
create or replace function record_app_feedback(p_post_id uuid, p_body text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid := auth.uid();
  v_author  uuid;
  v_type    post_type;
  v_is_demo boolean;
  v_joined  boolean;
begin
  if v_actor is null then
    raise exception 'auth required';
  end if;

  select author, type, is_demo into v_author, v_type, v_is_demo from posts where id = p_post_id;

  if v_author is null then
    raise exception 'post % not found', p_post_id;
  end if;
  if v_type <> 'app' then
    raise exception 'app feedback is for Beta Board apps only';
  end if;
  if v_is_demo then
    raise exception 'this is an example app — feedback is disabled on demo posts';
  end if;
  if v_author = v_actor then
    raise exception 'you cannot leave feedback on your own app';
  end if;

  select exists (select 1 from testers where post_id = p_post_id and user_id = v_actor)
    into v_joined;
  if not v_joined then
    raise exception 'join as a tester to leave feedback';
  end if;

  insert into reviews (post_id, author, body) values (p_post_id, v_actor, p_body);
  -- unique (post_id, author) → one feedback per user; NO karma (apps don't boost)
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. reply_to_review — the listing owner replies to a review (once).
-- ---------------------------------------------------------------------------
create or replace function reply_to_review(p_review_id uuid, p_reply text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_owner uuid;
  v_reply text := trim(coalesce(p_reply, ''));
begin
  if v_actor is null then
    raise exception 'auth required';
  end if;
  if char_length(v_reply) < 1 or char_length(v_reply) > 500 then
    raise exception 'reply must be 1–500 characters';
  end if;

  select p.author into v_owner
    from reviews r join posts p on p.id = r.post_id
   where r.id = p_review_id;
  if v_owner is null then
    raise exception 'review % not found', p_review_id;
  end if;
  if v_owner <> v_actor then
    raise exception 'only the listing owner can reply';
  end if;

  update reviews set reply = v_reply, replied_at = now() where id = p_review_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. update_app_details — maker edits their app's version/changelog/tester goals.
-- ---------------------------------------------------------------------------
create or replace function update_app_details(
  p_post_id     uuid,
  p_version     text,
  p_changelog   text,
  p_tester_goal integer,
  p_max_testers integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := auth.uid();
  v_author uuid;
  v_type   post_type;
  v_count  integer;
begin
  if v_actor is null then
    raise exception 'auth required';
  end if;

  select author, type, tester_count into v_author, v_type, v_count from posts where id = p_post_id;

  if v_author is null then
    raise exception 'post % not found', p_post_id;
  end if;
  if v_author <> v_actor then
    raise exception 'only the owner can edit this app';
  end if;
  if v_type <> 'app' then
    raise exception 'app details are for Beta Board apps only';
  end if;
  if p_tester_goal is not null and p_tester_goal < 1 then
    raise exception 'tester goal must be at least 1';
  end if;
  if p_max_testers is not null and p_max_testers < 1 then
    raise exception 'max testers must be at least 1';
  end if;
  if p_max_testers is not null and p_max_testers < v_count then
    raise exception 'max testers cannot be below the current tester count (%)', v_count;
  end if;

  update posts
     set version     = nullif(trim(coalesce(p_version, '')), ''),
         changelog   = nullif(trim(coalesce(p_changelog, '')), ''),
         tester_goal = p_tester_goal,
         max_testers = p_max_testers
   where id = p_post_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. studio_summary — the caller's OWN maker stats + 8-week activity. Definer
--    because karma_ledger has no recipient-read RLS (only actor self-read, 008)
--    and testers is self-read; this is the sanctioned window over received karma.
-- ---------------------------------------------------------------------------
create or replace function studio_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_maker        uuid := auth.uid();
  v_karma_week   integer;
  v_new_testers  integer;
  v_activity     jsonb;
begin
  if v_maker is null then
    raise exception 'auth required';
  end if;

  select coalesce(sum(points), 0) into v_karma_week
    from karma_ledger
   where user_id = v_maker and action = 'tester_joined'
     and created_at > now() - interval '7 days';

  select count(*) into v_new_testers
    from testers t join posts p on p.id = t.post_id
   where p.author = v_maker and t.created_at > now() - interval '7 days';

  select jsonb_agg(jsonb_build_object('week', wk, 'upvotes', upvotes, 'testers', testers) order by wk)
    into v_activity
    from (
      select
        (date_trunc('week', now()) - (g * interval '7 days'))::date as wk,
        (select count(*) from karma_ledger k
           where k.user_id = v_maker and k.action = 'upvote_received'
             and k.created_at >= date_trunc('week', now()) - (g * interval '7 days')
             and k.created_at <  date_trunc('week', now()) - ((g - 1) * interval '7 days'))::int as upvotes,
        (select count(*) from karma_ledger k
           where k.user_id = v_maker and k.action = 'tester_joined'
             and k.created_at >= date_trunc('week', now()) - (g * interval '7 days')
             and k.created_at <  date_trunc('week', now()) - ((g - 1) * interval '7 days'))::int as testers
      from generate_series(7, 0, -1) as g
    ) s;

  return jsonb_build_object(
    'karma_from_testers_week', v_karma_week,
    'new_testers_week', v_new_testers,
    'activity', coalesce(v_activity, '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. betas_tested — public count of a profile's beta joins (display fact).
--    Mirrors seller_rating_summary: definer window over the self-read testers.
-- ---------------------------------------------------------------------------
create or replace function betas_tested(p_profile_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  select count(*) into v_count from testers where user_id = p_profile_id;
  return coalesce(v_count, 0);
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. update_profile_identity — extended. Drop the old 2-arg/4-arg overloads,
--     recreate with per-field toggles. Still writes ONLY the caller's own row
--     and never touches handle/verified/campus/id/created_at (IDENTITY.md).
-- ---------------------------------------------------------------------------
drop function if exists update_profile_identity(text, text);
drop function if exists update_profile_identity(text, text, boolean, boolean);

create or replace function update_profile_identity(
  p_bio                  text    default null,
  p_avatar_image_url     text    default null,
  p_display_name         text    default null,
  p_college_year         text    default null,
  p_pronouns             text    default null,
  p_github_url           text    default null,
  p_website_url          text    default null,
  p_contact_email        text    default null,
  p_update_bio           boolean default false,
  p_update_avatar        boolean default false,
  p_update_display_name  boolean default false,
  p_update_college_year  boolean default false,
  p_update_pronouns      boolean default false,
  p_update_github        boolean default false,
  p_update_website       boolean default false,
  p_update_contact_email boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_name  text;
begin
  if v_actor is null then
    raise exception 'auth required';
  end if;

  -- display_name is required (not null); reject blanks when updating it
  if p_update_display_name then
    v_name := trim(coalesce(p_display_name, ''));
    if char_length(v_name) < 1 or char_length(v_name) > 60 then
      raise exception 'display name must be 1–60 characters';
    end if;
  end if;

  update profiles set
    bio              = case when p_update_bio           then nullif(trim(coalesce(p_bio, '')), '') else bio end,
    avatar_image_url = case when p_update_avatar        then nullif(trim(coalesce(p_avatar_image_url, '')), '') else avatar_image_url end,
    display_name     = case when p_update_display_name  then v_name else display_name end,
    college_year     = case when p_update_college_year  then nullif(trim(coalesce(p_college_year, '')), '') else college_year end,
    pronouns         = case when p_update_pronouns      then nullif(trim(coalesce(p_pronouns, '')), '') else pronouns end,
    github_url       = case when p_update_github        then nullif(trim(coalesce(p_github_url, '')), '') else github_url end,
    website_url      = case when p_update_website       then nullif(trim(coalesce(p_website_url, '')), '') else website_url end,
    contact_email    = case when p_update_contact_email then nullif(trim(coalesce(p_contact_email, '')), '') else contact_email end
  where id = v_actor;
end;
$$;

-- ---------------------------------------------------------------------------
-- grants
-- ---------------------------------------------------------------------------
revoke execute on function join_as_tester(uuid) from public, anon;
revoke execute on function record_app_feedback(uuid, text) from public, anon;
revoke execute on function reply_to_review(uuid, text) from public, anon;
revoke execute on function update_app_details(uuid, text, text, integer, integer) from public, anon;
revoke execute on function studio_summary() from public, anon;
revoke execute on function update_profile_identity(text, text, text, text, text, text, text, text, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean) from public, anon;

grant execute on function join_as_tester(uuid) to authenticated;
grant execute on function record_app_feedback(uuid, text) to authenticated;
grant execute on function reply_to_review(uuid, text) to authenticated;
grant execute on function update_app_details(uuid, text, text, integer, integer) to authenticated;
grant execute on function studio_summary() to authenticated;
grant execute on function update_profile_identity(text, text, text, text, text, text, text, text, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean) to authenticated;

-- betas_tested is a public display fact (like seller_rating_summary / profile_reputation)
grant execute on function betas_tested(uuid) to anon, authenticated;
