-- Fix profile_reputation(): `text[] || 'literal'` makes Postgres parse the
-- untyped literal as an array ("malformed array literal"). Cast to ::text.

create or replace function profile_reputation(p_profile_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_verified integer;
  v_badges text[] := '{}';
begin
  select coalesce(sum(points), 0),
         coalesce(sum(points) filter (where verified), 0)
    into v_total, v_verified
    from karma_ledger
   where user_id = p_profile_id;

  -- platform badges, derived from the ledger only
  if v_total > 0 then v_badges := v_badges || 'karma-earner'::text; end if;
  if v_total >= 50 then v_badges := v_badges || 'slug-50'::text; end if;
  if v_verified >= 15 then v_badges := v_badges || 'verified-contributor'::text; end if;

  return jsonb_build_object(
    'total_karma', v_total,
    'verified_karma', v_verified,
    'cosmetic_karma', v_total - v_verified,
    'badges', to_jsonb(v_badges)
  );
end;
$$;
