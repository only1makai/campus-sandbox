-- Session 4: Makers Market goes live + reviews as the first VERIFIED karma path.
--
-- Maker-specific columns added to posts (kept minimal on purpose):
--   price_cents     — integer price, null for apps
--   location_label  — campus pickup spot, e.g. "Quarry Plaza"
-- Category rides in the existing tags[] (tags[1]) — no new column needed.
--
-- Reviews: one review per user per post, immutable (MVP). Public read;
-- writes only through record_review() (security definer, authenticated-only),
-- same pattern as the karma functions. Self-review is blocked in the function.
--
-- VERIFIED KARMA: reviews write karma_ledger rows with verified=true (+15 to
-- the maker; actor = reviewer's auth.uid()). Cosmetic actions (upvotes, CTA
-- clicks) stay verified=false. GUARDRAIL unchanged: NO karma — verified or
-- not — feeds any ordering. Ranking logic is a later, separate session.

-- ---------------------------------------------------------------------------
-- posts: maker-specific columns
-- ---------------------------------------------------------------------------
alter table posts add column price_cents integer;
alter table posts add column location_label text;

-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------
create table reviews (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references posts (id) on delete cascade,
  author     uuid not null references profiles (id) on delete cascade,
  body       text not null check (char_length(body) between 3 and 280),
  created_at timestamptz not null default now(),
  unique (post_id, author)   -- one review per user per post
);

create index reviews_post_idx on reviews (post_id, created_at desc);

alter table reviews enable row level security;

create policy "reviews are publicly readable"
  on reviews for select using (true);
-- no insert/update/delete policies: writes only via record_review()

-- ---------------------------------------------------------------------------
-- record_review: review row + verified karma row, atomically
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
  -- unique (post_id, author) surfaces duplicates as an error to the caller

  insert into karma_ledger (user_id, actor_id, action, points, source_post_id, verified)
  values (v_author, v_actor, 'review_received', 15, p_post_id, true);
end;
$$;

revoke execute on function record_review(uuid, text) from public, anon;
grant execute on function record_review(uuid, text) to authenticated;
