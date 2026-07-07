-- Session 3: real auth on the shared profiles identity model.
--
-- 1. UCSC gate at the substrate: only @ucsc.edu emails can become auth.users.
-- 2. Profile creation via DB trigger (id = auth.uid()); @ucsc.edu gate IS the
--    "verified student" mechanism — verified flips true on confirmed email.
-- 3. karma_ledger gains actor_id: WHO acted (real auth.uid()). user_id stays
--    the karma RECIPIENT (post author) — both matter for future abuse review.
-- 4. Karma functions now derive the actor from auth.uid() and are executable
--    by authenticated users only (upvoting requires auth; browsing stays public).
--
-- No Sandbox-specific columns are added to profiles — it stays the generic
-- shared join point for CAL-Links (handle, display_name, campus, avatar_color,
-- verified only).

-- ---------------------------------------------------------------------------
-- 1. UCSC email gate (hard gate — server action validates too, for nice errors)
-- ---------------------------------------------------------------------------
create or replace function public.auth_gate_ucsc()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is null or new.email !~* '@ucsc\.edu$' then
    raise exception 'Campus Sandbox is UCSC-only: sign up with your @ucsc.edu email';
  end if;
  return new;
end;
$$;

create trigger gate_ucsc_email
  before insert on auth.users
  for each row execute function public.auth_gate_ucsc();

-- ---------------------------------------------------------------------------
-- 2. Profile creation on signup + verified on email confirmation
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_handle text;
  v_display text;
begin
  v_handle := coalesce(nullif(trim(new.raw_user_meta_data->>'handle'), ''),
                       split_part(new.email, '@', 1));
  v_handle := lower(regexp_replace(v_handle, '[^a-z0-9._-]', '', 'g'));
  if length(v_handle) < 2 then
    v_handle := 'slug.' || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;
  v_handle := left(v_handle, 27);

  -- handle collision: append a short id-derived suffix
  if exists (select 1 from profiles where handle = v_handle) then
    v_handle := v_handle || '.' || substr(replace(new.id::text, '-', ''), 1, 4);
  end if;

  v_display := coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), v_handle);

  insert into profiles (id, handle, display_name, campus, verified, avatar_color)
  values (
    new.id,
    v_handle,
    v_display,
    'ucsc',
    new.email_confirmed_at is not null,  -- admin-confirmed users verify immediately
    (array['gold','live-green','link-blue','tomato','grape'])[1 + floor(random() * 5)::int]
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    update profiles set verified = true where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_confirmed
  after update on auth.users
  for each row execute function public.handle_user_confirmed();

-- ---------------------------------------------------------------------------
-- 3. karma_ledger: record the acting user (append-only shape unchanged)
-- ---------------------------------------------------------------------------
alter table karma_ledger
  add column actor_id uuid references profiles (id) on delete set null;

comment on column karma_ledger.user_id is 'karma recipient (post author)';
comment on column karma_ledger.actor_id is 'acting user (auth.uid() of clicker); null on pre-auth rows';

-- ---------------------------------------------------------------------------
-- 4. Karma functions: actor = auth.uid(), executable by authenticated only.
--    GUARDRAIL unchanged: karma never affects feed ordering.
-- ---------------------------------------------------------------------------
create or replace function record_upvote(p_post_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_author uuid;
  v_upvotes integer;
begin
  if v_actor is null then
    raise exception 'auth required';
  end if;

  update posts
     set upvotes = upvotes + 1
   where id = p_post_id
   returning author, upvotes into v_author, v_upvotes;

  if v_author is null then
    raise exception 'post % not found', p_post_id;
  end if;

  insert into karma_ledger (user_id, actor_id, action, points, source_post_id)
  values (v_author, v_actor, 'upvote_received', 1, p_post_id);

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
  v_actor uuid := auth.uid();
  v_author uuid;
begin
  if v_actor is null then
    raise exception 'auth required';
  end if;

  select author into v_author from posts where id = p_post_id;

  if v_author is null then
    raise exception 'post % not found', p_post_id;
  end if;

  insert into karma_ledger (user_id, actor_id, action, points, source_post_id)
  values (v_author, v_actor, 'cta_click', 5, p_post_id);
end;
$$;

revoke execute on function record_upvote(uuid) from public, anon;
revoke execute on function record_cta_click(uuid) from public, anon;
grant execute on function record_upvote(uuid) to authenticated;
grant execute on function record_cta_click(uuid) to authenticated;
