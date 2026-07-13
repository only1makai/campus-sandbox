-- Session 16 P1: listing photos + thrift condition + storefront identity fields.
--
-- Adds the first image support to posts (image_urls[]), a thrift condition
-- scale, and four storefront fields on profiles. One new Storage bucket
-- (listing-images), mirroring the 007 avatar-bucket pattern. create_post and
-- update_shop_profile grow to carry the new fields; ranked_posts is recreated
-- so `select p.*` surfaces the new posts columns to fetchShopPosts/fetchPostById.
--
-- Write path is unchanged in shape: posts stays default-deny (no INSERT policy);
-- create_post (security definer) remains the only door. image_urls/condition
-- are written ONLY inside create_post.

-- ---------------------------------------------------------------------------
-- 1. Storage bucket — listing-images (public read, owner-prefix INSERT only).
--    Path scheme: listing photos {uid}/{draftToken}/{n}.{ext}; shop hero
--    {uid}/hero/{token}.{ext} — both satisfy foldername[1] = uid.
--    NO update/delete policies: listings are creation-only today (no edit), and
--    re-picking a photo in the uploader writes a fresh path rather than
--    overwriting. Orphaned objects are a documented future concern (cleanup
--    only becomes relevant once post deletion exists) — see docs/COMMERCE.md.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-images',
  'listing-images',
  true,
  5242880,  -- 5MB cap (matches avatars; client downscales before upload)
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy "listing images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'listing-images');

create policy "users upload their own listing images"
  on storage.objects for insert
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- 2. posts columns — image_urls (element 0 = card image; count enforced in RPC,
--    up to 3 shop / 1 thrift) and condition (thrift only, optional). Condition
--    allowlist is a clean table CHECK; count-by-type stays in the RPC (a table
--    constraint can't cleanly branch on type).
-- ---------------------------------------------------------------------------
alter table posts add column image_urls text[];
alter table posts add column condition  text
  check (condition is null or condition in ('New','Like new','Good','Used','Well-loved'));

comment on column posts.image_urls is
  'listing photos; element 0 is the card image. up to 3 (shop) / 1 (thrift), enforced in create_post. null on legacy/app rows.';
comment on column posts.condition is
  'thrift item condition (optional). one of New/Like new/Good/Used/Well-loved; null on shop/app/legacy rows.';

-- ---------------------------------------------------------------------------
-- 3. recreate ranked_posts so `select p.*` surfaces image_urls/condition to
--    fetchShopPosts + fetchPostById. Formula BYTE-IDENTICAL to migration 017
--    (BOOST_CAP 10, 3-day window). Thrift feed reads base posts directly, so it
--    picks up the new columns without any view change.
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
-- 4. profiles storefront fields (extend Session-14 shop identity). Bounds are
--    CHECK-enforced at the table AND validated in update_shop_profile.
-- ---------------------------------------------------------------------------
alter table profiles add column shop_hero_url   text;
alter table profiles add column specialty_tags  text[]
  check (specialty_tags is null or array_length(specialty_tags, 1) <= 5);
alter table profiles add column accepts_custom  boolean not null default false;
alter table profiles add column shop_story      text
  check (shop_story is null or char_length(shop_story) <= 400);

-- ---------------------------------------------------------------------------
-- 5. create_post — add p_image_urls + p_condition. Drop the 7-arg signature and
--    recreate with 9 args. Per-type validation: images ≤3 shop / ≤1 thrift, each
--    URL must point at our listing-images public prefix; condition is thrift-only
--    and OPTIONAL (null allowed) but rejected on shop. Description bounds become
--    per-type: shop 3–600, thrift 3–280 (was a flat 3–500). Everything else
--    (title/price/category/location/banner/app-reject/rate-limit) unchanged.
-- ---------------------------------------------------------------------------
drop function if exists create_post(text, text, text, integer, text, text, text);

create or replace function create_post(
  p_type         text,
  p_title        text,
  p_description  text,
  p_price_cents  integer,
  p_category     text,
  p_location     text,
  p_banner_color text,
  p_image_urls   text[] default null,
  p_condition    text   default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author   uuid := auth.uid();
  v_title    text := trim(coalesce(p_title, ''));
  v_desc     text := trim(coalesce(p_description, ''));
  v_category text := lower(trim(coalesce(p_category, '')));
  v_location text := trim(coalesce(p_location, ''));
  v_condition text := nullif(trim(coalesce(p_condition, '')), '');
  v_images   text[] := coalesce(p_image_urls, array[]::text[]);
  v_img      text;
  v_max_images integer;
  v_desc_max integer;
  v_recent   integer;
  v_status       text;
  v_status_label text;
  v_id       uuid;
  shop_categories text[] := array[
    'ceramics','apparel','prints','stickers','jewelry','plants','flowers',
    'candles','fiber','art','food','service','other'
  ];
  thrift_categories text[] := array[
    'furniture','electronics','textbooks','clothing','kitchen','decor','bikes','other'
  ];
begin
  if v_author is null then
    raise exception 'auth required';
  end if;

  -- type: shop/thrift only — 'app' is explicitly not self-serve
  if p_type not in ('shop', 'thrift') then
    raise exception 'app posts aren''t self-serve yet — pick shop or thrift';
  end if;

  if char_length(v_title) < 2 or char_length(v_title) > 80 then
    raise exception 'title must be 2–80 characters';
  end if;

  -- description bound is per-type (shop 3–600, thrift 3–280)
  v_desc_max := case when p_type = 'shop' then 600 else 280 end;
  if char_length(v_desc) < 3 or char_length(v_desc) > v_desc_max then
    raise exception 'description must be 3–% characters', v_desc_max;
  end if;

  if p_price_cents is null or p_price_cents < 1 or p_price_cents > 1000000 then
    raise exception 'price must be between $0.01 and $10,000';
  end if;

  if p_type = 'shop' and not (v_category = any(shop_categories)) then
    raise exception 'pick a valid category';
  end if;
  if p_type = 'thrift' and not (v_category = any(thrift_categories)) then
    raise exception 'pick a valid category';
  end if;

  if char_length(v_location) < 2 or char_length(v_location) > 60 then
    raise exception 'location must be 2–60 characters';
  end if;

  if p_banner_color not in ('gold', 'live-green', 'link-blue', 'tomato', 'grape') then
    raise exception 'pick a valid color';
  end if;

  -- images: up to 3 shop / 1 thrift; each must be one of our listing-images
  -- public URLs (defends against arbitrary/off-site URLs slipping in).
  v_max_images := case when p_type = 'shop' then 3 else 1 end;
  if array_length(v_images, 1) > v_max_images then
    raise exception 'too many images: max % for %', v_max_images, p_type;
  end if;
  foreach v_img in array v_images loop
    if v_img is null or v_img !~ '/storage/v1/object/public/listing-images/' then
      raise exception 'invalid image url';
    end if;
  end loop;

  -- condition: thrift-only and optional. Rejected outright on shop.
  if p_type = 'shop' and v_condition is not null then
    raise exception 'condition is thrift-only';
  end if;
  if v_condition is not null
     and v_condition not in ('New','Like new','Good','Used','Well-loved') then
    raise exception 'pick a valid condition';
  end if;

  -- rate limit: max 5 new posts per author per rolling 24h
  select count(*) into v_recent
    from posts
   where author = v_author
     and created_at > now() - interval '24 hours';
  if v_recent >= 5 then
    raise exception 'posting limit reached: max 5 new listings per 24 hours';
  end if;

  if p_type = 'shop' then
    v_status := 'in_stock';
    v_status_label := 'In stock';
  else
    v_status := 'available';
    v_status_label := 'Available';
  end if;

  insert into posts (
    type, author, title, description, price_cents, tags,
    location_label, banner_color, status, status_label,
    image_urls, condition
  )
  values (
    p_type::post_type, v_author, v_title, v_desc, p_price_cents, array[v_category],
    v_location, p_banner_color, v_status, v_status_label,
    nullif(v_images, array[]::text[]), v_condition
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function create_post(text, text, text, integer, text, text, text, text[], text) from public, anon;
grant  execute on function create_post(text, text, text, integer, text, text, text, text[], text) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. update_shop_profile — add shop_hero_url, specialty_tags, accepts_custom,
--    shop_story. Drop the 3-arg signature, recreate with 7. Same owner-only
--    gate; tag count ≤5 and story ≤400 validated server-side (belt-and-suspenders
--    with the table CHECKs). Existing 3-arg named-arg callers must update to the
--    new signature (this migration ships with the app change).
-- ---------------------------------------------------------------------------
drop function if exists update_shop_profile(text, text, text);

create or replace function update_shop_profile(
  p_shop_name         text,
  p_shop_tagline      text,
  p_shop_banner_color text,
  p_shop_hero_url     text   default null,
  p_specialty_tags    text[] default null,
  p_accepts_custom    boolean default false,
  p_shop_story        text   default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_tags  text[] := coalesce(p_specialty_tags, array[]::text[]);
  v_story text := nullif(trim(coalesce(p_shop_story, '')), '');
begin
  if v_actor is null then
    raise exception 'auth required';
  end if;
  if p_shop_banner_color is not null
     and p_shop_banner_color not in ('gold','live-green','link-blue','tomato','grape') then
    raise exception 'invalid banner color';
  end if;
  if array_length(v_tags, 1) > 5 then
    raise exception 'max 5 specialty tags';
  end if;
  if v_story is not null and char_length(v_story) > 400 then
    raise exception 'shop story maxes out at 400 characters';
  end if;

  update profiles set
    shop_name         = nullif(trim(coalesce(p_shop_name, '')), ''),
    shop_tagline      = nullif(trim(coalesce(p_shop_tagline, '')), ''),
    shop_banner_color = nullif(trim(coalesce(p_shop_banner_color, '')), ''),
    shop_hero_url     = nullif(trim(coalesce(p_shop_hero_url, '')), ''),
    specialty_tags    = nullif(v_tags, array[]::text[]),
    accepts_custom    = coalesce(p_accepts_custom, false),
    shop_story        = v_story
  where id = v_actor;
end;
$$;

revoke execute on function update_shop_profile(text, text, text, text, text[], boolean, text) from public, anon;
grant  execute on function update_shop_profile(text, text, text, text, text[], boolean, text) to authenticated;
