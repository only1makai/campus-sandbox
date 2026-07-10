-- Follow-up to Session 13c: lock handle after it's first set; display_name
-- stays freely editable (already correct from 017/13c — unchanged here).
--
-- update_profile_identity never exposed a p_handle param before this, so
-- handle was already un-changeable through the app. This adds an EXPLICIT
-- guard anyway (defense-in-depth): a p_handle/p_update_handle pair that
-- rejects any attempt to change an existing handle, and only allows a
-- one-time set when the profile's handle is null. Note: profiles.handle is
-- `not null` at the column level (schema.sql), so the "null handle" branch
-- is schema-unreachable today — written defensively in case that constraint
-- is ever relaxed, not because it fires in practice.
drop function if exists update_profile_identity(
  text, text, text, text, text, text, text, text,
  boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean
);

create or replace function update_profile_identity(
  p_bio                  text    default null,
  p_avatar_image_url     text    default null,
  p_display_name         text    default null,
  p_college_year         text    default null,
  p_pronouns             text    default null,
  p_github_url           text    default null,
  p_website_url          text    default null,
  p_contact_email        text    default null,
  p_handle               text    default null,
  p_update_bio           boolean default false,
  p_update_avatar        boolean default false,
  p_update_display_name  boolean default false,
  p_update_college_year  boolean default false,
  p_update_pronouns      boolean default false,
  p_update_github        boolean default false,
  p_update_website       boolean default false,
  p_update_contact_email boolean default false,
  p_update_handle        boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor          uuid := auth.uid();
  v_name           text;
  v_current_handle text;
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

  -- handle: permanent once set. Allow exactly one set from null (schema-
  -- unreachable today since the column is NOT NULL, kept for defense-in-depth);
  -- reject any change to an existing non-null handle, even to the same
  -- value in a different case/format — this RPC does not re-validate
  -- format/uniqueness, that's the table's job on the one-time set path.
  if p_update_handle then
    select handle into v_current_handle from profiles where id = v_actor;
    if v_current_handle is not null then
      raise exception 'handles can''t be changed once set';
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
    contact_email    = case when p_update_contact_email then nullif(trim(coalesce(p_contact_email, '')), '') else contact_email end,
    handle           = case when p_update_handle        then lower(trim(coalesce(p_handle, ''))) else handle end
  where id = v_actor;
end;
$$;

revoke execute on function update_profile_identity(
  text, text, text, text, text, text, text, text, text,
  boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean
) from public, anon;
grant execute on function update_profile_identity(
  text, text, text, text, text, text, text, text, text,
  boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean
) to authenticated;
