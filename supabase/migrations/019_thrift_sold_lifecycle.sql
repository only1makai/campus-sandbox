-- Session 14 P1: sold-thrift lifecycle.
--   * posts.sold_at — when a thrift item was marked sold (null otherwise).
--   * update_thrift_status stamps sold_at on 'sold', clears it on 'available'.
-- Sold posts are NEVER deleted — the row persists forever as the seller's sales
-- history; only its PUBLIC feed visibility is time-limited (24h, enforced in
-- lib/queries fetchThriftFeed). No cron/job deletes posts anywhere today.
alter table posts add column sold_at timestamptz;

comment on column posts.sold_at is
  'thrift only: when the seller marked it sold (null otherwise). The row is '
  'permanent; sold items just leave the public feed 24h after this.';

-- same signature as migration 010 → create or replace preserves the existing
-- grants (authenticated-only). Only change: the sold_at stamp/clear.
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

  update posts
     set status = p_status,
         status_label = initcap(p_status),
         sold_at = case when p_status = 'sold' then now() else null end
   where id = p_post_id;
end;
$$;
