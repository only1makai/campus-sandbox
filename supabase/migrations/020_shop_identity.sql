-- Session 14 P3: seller storefront identity + an Instagram contact link.
--
-- shop_name/shop_tagline/shop_banner_color are Sandbox commerce concepts
-- (Studio-editable, shown on the public "Selling" section) — NOT part of the
-- shared identity seam (lib/identity stays commerce-free per IDENTITY.md).
-- They live on the profiles TABLE (public-read like the rest) but are read via
-- a Sandbox accessor and written via a narrow commerce RPC, not through
-- update_profile_identity. instagram_url IS a generic contact link (same class
-- as github/website) → it joins the identity RPC + shared Profile type.

alter table profiles add column shop_name        text check (shop_name is null or char_length(shop_name) <= 60);
alter table profiles add column shop_tagline      text check (shop_tagline is null or char_length(shop_tagline) <= 80);
alter table profiles add column shop_banner_color text check (shop_banner_color is null or shop_banner_color in ('gold','live-green','link-blue','tomato','grape'));
alter table profiles add column instagram_url     text check (instagram_url is null or instagram_url ~* '^https?://');

-- ---------------------------------------------------------------------------
-- update_shop_profile — narrow Studio-only write for the storefront fields.
-- Writes the caller's own row; all three set together (the Studio form submits
-- as a unit, no per-field toggles needed).
-- ---------------------------------------------------------------------------
create or replace function update_shop_profile(
  p_shop_name         text,
  p_shop_tagline      text,
  p_shop_banner_color text
)
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
  if p_shop_banner_color is not null
     and p_shop_banner_color not in ('gold','live-green','link-blue','tomato','grape') then
    raise exception 'invalid banner color';
  end if;

  update profiles set
    shop_name         = nullif(trim(coalesce(p_shop_name, '')), ''),
    shop_tagline      = nullif(trim(coalesce(p_shop_tagline, '')), ''),
    shop_banner_color = nullif(trim(coalesce(p_shop_banner_color, '')), '')
  where id = v_actor;
end;
$$;

revoke execute on function update_shop_profile(text, text, text) from public, anon;
grant execute on function update_shop_profile(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- extend update_profile_identity with instagram_url (+ toggle). Drop the
-- 19-param signature from migration 018, recreate with 20. Existing named-arg
-- callers keep working (new toggle defaults false). handle/verified/campus
-- still never touched.
-- ---------------------------------------------------------------------------
drop function if exists update_profile_identity(
  text, text, text, text, text, text, text, text, text,
  boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean
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
  p_instagram_url        text    default null,
  p_update_bio           boolean default false,
  p_update_avatar        boolean default false,
  p_update_display_name  boolean default false,
  p_update_college_year  boolean default false,
  p_update_pronouns      boolean default false,
  p_update_github        boolean default false,
  p_update_website       boolean default false,
  p_update_contact_email boolean default false,
  p_update_handle        boolean default false,
  p_update_instagram     boolean default false
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

  if p_update_display_name then
    v_name := trim(coalesce(p_display_name, ''));
    if char_length(v_name) < 1 or char_length(v_name) > 60 then
      raise exception 'display name must be 1–60 characters';
    end if;
  end if;

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
    instagram_url    = case when p_update_instagram     then nullif(trim(coalesce(p_instagram_url, '')), '') else instagram_url end,
    handle           = case when p_update_handle        then lower(trim(coalesce(p_handle, ''))) else handle end
  where id = v_actor;
end;
$$;

revoke execute on function update_profile_identity(
  text, text, text, text, text, text, text, text, text, text,
  boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean
) from public, anon;
grant execute on function update_profile_identity(
  text, text, text, text, text, text, text, text, text, text,
  boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean
) to authenticated;
