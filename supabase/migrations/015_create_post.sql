-- Session 13d: create_post — the FIRST user-facing write path to posts.
--
-- posts stays default-deny for direct inserts (no INSERT policy, ever). This
-- security-definer RPC is the only door, exactly like record_review /
-- rate_seller / create_request. Author is always auth.uid(), never a
-- parameter. Shop + thrift only — 'app' (Beta Board) creation stays stubbed.
-- Thrift expires_at is stamped by the existing BEFORE INSERT trigger
-- (migration 010), NOT here. Creating a post grants no karma.
create or replace function create_post(
  p_type         text,
  p_title        text,
  p_description  text,
  p_price_cents  integer,
  p_category     text,
  p_location     text,
  p_banner_color text
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

  if char_length(v_desc) < 3 or char_length(v_desc) > 500 then
    raise exception 'description must be 3–500 characters';
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

  -- rate limit: max 5 new posts per author per rolling 24h (tighter than
  -- create_request's 10/24h — posting should be rarer than contacting sellers)
  select count(*) into v_recent
    from posts
   where author = v_author
     and created_at > now() - interval '24 hours';
  if v_recent >= 5 then
    raise exception 'posting limit reached: max 5 new listings per 24 hours';
  end if;

  -- status by type. status_label is cosmetic (the card no longer renders it),
  -- set for data hygiene. Thrift status starts 'available'; sellers end early
  -- via update_thrift_status(... 'sold').
  if p_type = 'shop' then
    v_status := 'in_stock';
    v_status_label := 'In stock';
  else
    v_status := 'available';
    v_status_label := 'Available';
  end if;

  insert into posts (
    type, author, title, description, price_cents, tags,
    location_label, banner_color, status, status_label
  )
  values (
    p_type::post_type, v_author, v_title, v_desc, p_price_cents, array[v_category],
    v_location, p_banner_color, v_status, v_status_label
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function create_post(text, text, text, integer, text, text, text) from public, anon;
grant execute on function create_post(text, text, text, integer, text, text, text) to authenticated;
