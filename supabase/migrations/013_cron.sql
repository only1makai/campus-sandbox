-- Session 12: one scheduler (pg_cron), two cleanup jobs.
--
-- pg_cron 1.6.4 is available on this Supabase plan (confirmed live) but was
-- not yet installed. Enabling it in-DB keeps the whole retention/expiry design
-- self-contained in migrations — no app route, env var, or deploy dependency
-- (the Vercel-cron fallback was not needed).
--
--   job 1  thrift-expiry       flip lapsed thrift listings to 'expired'
--   job 2  request-retention   hard-delete spent/stale requests (+ messages)
--
-- Both jobs are idempotent and re-running this migration re-registers them by
-- name (cron.schedule upserts on the job name).

create extension if not exists pg_cron;

-- ---------------------------------------------------------------------------
-- request retention: hard-delete requests (messages cascade via FK) that are
--   * fulfilled/declined and idle > 48h, OR
--   * idle > 14 days regardless of status.
-- seller_ratings have no FK to requests, so they are NOT touched (permanent
-- reputation survives; see migration 012).
-- ---------------------------------------------------------------------------
create or replace function cleanup_expired_requests()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  with deleted as (
    delete from requests
     where (status in ('fulfilled', 'declined')
            and last_activity_at < now() - interval '48 hours')
        or (last_activity_at < now() - interval '14 days')
    returning 1
  )
  select count(*) into v_count from deleted;
  return v_count;
end;
$$;

revoke execute on function cleanup_expired_requests() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- schedule the two jobs (hourly, offset so they don't collide)
-- ---------------------------------------------------------------------------
select cron.schedule('thrift-expiry',     '30 * * * *', $$select public.expire_thrift_posts()$$);
select cron.schedule('request-retention', '0 * * * *',  $$select public.cleanup_expired_requests()$$);
