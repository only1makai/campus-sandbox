-- Session 12 (B): the ephemeral Request system — buyer↔seller contact on any
-- commerce post (shop OR thrift).
--
-- RLS is the critical shape here: exactly the buyer and the seller on a
-- request can read it and its messages. No other authenticated user, ever.
-- (Session 11 lesson: a blocked SELECT returns zero rows silently, so the
-- live test proves DENIAL — service-role confirms the row exists, the third
-- account sees nothing.)
--
-- Writes go through security-definer functions (same pattern as karma/reviews)
-- which re-check participation defensively — definer rights bypass RLS, so the
-- function, not the policy, is the write gate.
--
-- Ephemeral: requests + messages are hard-deleted by the retention cron
-- (migration 013). Seller ratings (migration 012) are deliberately NOT
-- children of requests and survive that deletion.

-- ---------------------------------------------------------------------------
-- enum + tables
-- ---------------------------------------------------------------------------
create type request_status as enum ('open', 'fulfilled', 'declined', 'expired');

create table requests (
  id               uuid primary key default gen_random_uuid(),
  post_id          uuid not null references posts (id) on delete cascade,
  buyer_id         uuid not null references profiles (id) on delete cascade,
  seller_id        uuid not null references profiles (id) on delete cascade,  -- denormalized from posts.author
  status           request_status not null default 'open',
  created_at       timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  check (buyer_id <> seller_id)   -- self-contact impossible by construction
);

create index requests_buyer_idx on requests (buyer_id, created_at desc);
create index requests_seller_idx on requests (seller_id, created_at desc);
create index requests_post_idx on requests (post_id);
-- retention cron scans on this; keep it indexed
create index requests_activity_idx on requests (last_activity_at);

create table request_messages (
  id         uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests (id) on delete cascade,
  sender_id  uuid not null references profiles (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index request_messages_req_idx on request_messages (request_id, created_at);

-- ---------------------------------------------------------------------------
-- 20-message hard cap per request (trigger — rejects #21 with a clear error)
-- ---------------------------------------------------------------------------
create or replace function enforce_request_message_cap()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from request_messages where request_id = new.request_id) >= 20 then
    raise exception 'message cap reached: a request allows at most 20 messages';
  end if;
  return new;
end;
$$;

create trigger request_message_cap
  before insert on request_messages
  for each row execute function enforce_request_message_cap();

-- ---------------------------------------------------------------------------
-- RLS: buyer or seller only. Read via policy; write via functions below.
-- ---------------------------------------------------------------------------
alter table requests enable row level security;
alter table request_messages enable row level security;

create policy "requests readable by buyer or seller"
  on requests for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- messages inherit the parent's participants. The subquery is itself
-- RLS-filtered, which only reinforces the restriction.
create policy "request messages readable by buyer or seller"
  on request_messages for select
  using (
    exists (
      select 1 from requests r
       where r.id = request_messages.request_id
         and (auth.uid() = r.buyer_id or auth.uid() = r.seller_id)
    )
  );
-- no insert/update/delete policies: all writes go through the functions below.

-- ---------------------------------------------------------------------------
-- create_request(post_id): buyer = auth.uid(); seller denormalized from the
-- post. Rate limit: max 10 new requests per buyer per rolling 24h.
-- ---------------------------------------------------------------------------
create or replace function create_request(p_post_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer  uuid := auth.uid();
  v_seller uuid;
  v_recent integer;
  v_id     uuid;
begin
  if v_buyer is null then
    raise exception 'auth required';
  end if;

  select author into v_seller from posts where id = p_post_id;
  if v_seller is null then
    raise exception 'post % not found', p_post_id;
  end if;
  if v_seller = v_buyer then
    raise exception 'you cannot start a request on your own listing';
  end if;

  select count(*) into v_recent
    from requests
   where buyer_id = v_buyer
     and created_at > now() - interval '24 hours';
  if v_recent >= 10 then
    raise exception 'request limit reached: max 10 new requests per 24 hours';
  end if;

  insert into requests (post_id, buyer_id, seller_id)
  values (p_post_id, v_buyer, v_seller)
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- send_request_message(request_id, body): sender must be a participant.
-- Bumps last_activity_at. The 20-cap trigger guards the count.
-- ---------------------------------------------------------------------------
create or replace function send_request_message(p_request_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender uuid := auth.uid();
  v_buyer  uuid;
  v_seller uuid;
  v_status request_status;
  v_id     uuid;
  v_body   text := trim(coalesce(p_body, ''));
begin
  if v_sender is null then
    raise exception 'auth required';
  end if;
  if char_length(v_body) < 1 or char_length(v_body) > 1000 then
    raise exception 'message must be 1–1000 characters';
  end if;

  select buyer_id, seller_id, status
    into v_buyer, v_seller, v_status
    from requests where id = p_request_id;
  if v_buyer is null then
    raise exception 'request % not found', p_request_id;
  end if;
  if v_sender <> v_buyer and v_sender <> v_seller then
    raise exception 'not a participant on this request';
  end if;
  if v_status in ('declined', 'expired') then
    raise exception 'this request is closed';
  end if;

  insert into request_messages (request_id, sender_id, body)
  values (p_request_id, v_sender, v_body)
  returning id into v_id;

  update requests set last_activity_at = now() where id = p_request_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- update_request_status(request_id, status): either participant may move a
-- request to open/fulfilled/declined. 'expired' is system-only (cron).
-- ---------------------------------------------------------------------------
create or replace function update_request_status(p_request_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := auth.uid();
  v_buyer  uuid;
  v_seller uuid;
begin
  if v_actor is null then
    raise exception 'auth required';
  end if;
  if p_status not in ('open', 'fulfilled', 'declined') then
    raise exception 'status must be open, fulfilled, or declined';
  end if;

  select buyer_id, seller_id into v_buyer, v_seller
    from requests where id = p_request_id;
  if v_buyer is null then
    raise exception 'request % not found', p_request_id;
  end if;
  if v_actor <> v_buyer and v_actor <> v_seller then
    raise exception 'not a participant on this request';
  end if;

  update requests
     set status = p_status::request_status,
         last_activity_at = now()
   where id = p_request_id;
end;
$$;

revoke execute on function create_request(uuid) from public, anon;
revoke execute on function send_request_message(uuid, text) from public, anon;
revoke execute on function update_request_status(uuid, text) from public, anon;
grant execute on function create_request(uuid) to authenticated;
grant execute on function send_request_message(uuid, text) to authenticated;
grant execute on function update_request_status(uuid, text) to authenticated;
