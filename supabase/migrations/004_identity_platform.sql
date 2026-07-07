-- Session 6: shared-identity platform groundwork.
--
-- 1. Generic profile enrichment (SHARED identity, not Sandbox features):
--    avatar_image_url (nullable; avatar_color stays the fallback) and bio.
-- 2. update_profile_identity(): the only write path for these fields —
--    a user edits their OWN row, never handle/verified/campus. Handles stay
--    immutable to users (no UPDATE policy on profiles; function won't touch it).
-- 3. profile_reputation(): read-only, cross-product reputation accessor.
--    Aggregates karma_ledger (which stays locked to direct reads) into
--    totals + badges. GUARDRAIL: display-only — feeds NO ranking/ordering.

-- ---------------------------------------------------------------------------
-- 1. profiles enrichment (generic identity fields only)
-- ---------------------------------------------------------------------------
alter table profiles add column avatar_image_url text
  check (avatar_image_url is null or avatar_image_url ~* '^https?://');
alter table profiles add column bio text
  check (bio is null or char_length(bio) <= 280);

-- ---------------------------------------------------------------------------
-- 2. self-service identity edit (bio + avatar image only)
-- ---------------------------------------------------------------------------
create or replace function update_profile_identity(p_bio text, p_avatar_image_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'auth required';
  end if;

  update profiles
     set bio = nullif(trim(coalesce(p_bio, '')), ''),
         avatar_image_url = nullif(trim(coalesce(p_avatar_image_url, '')), '')
   where id = v_actor;
end;
$$;

revoke execute on function update_profile_identity(text, text) from public, anon;
grant execute on function update_profile_identity(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. cross-product reputation (read-only aggregates; never row-level ledger)
-- ---------------------------------------------------------------------------
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
  if v_total > 0 then v_badges := v_badges || 'karma-earner'; end if;
  if v_total >= 50 then v_badges := v_badges || 'slug-50'; end if;
  if v_verified >= 15 then v_badges := v_badges || 'verified-contributor'; end if;

  return jsonb_build_object(
    'total_karma', v_total,
    'verified_karma', v_verified,
    'cosmetic_karma', v_total - v_verified,
    'badges', to_jsonb(v_badges)
  );
end;
$$;

-- public display fact: readable by everyone (aggregates only)
grant execute on function profile_reputation(uuid) to anon, authenticated;
