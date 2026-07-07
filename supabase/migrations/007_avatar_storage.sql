-- Session 8: avatar image storage + the write-path that fills the
-- avatar_image_url column added in Session 6.
--
-- Bucket + RLS created via SQL (storage.buckets/storage.objects are plain
-- tables) — no Supabase dashboard step needed.
--
-- Path convention: avatars/{auth.uid()}/avatar — one file per user, fixed
-- name, upsert on re-upload. No orphaned files from extension churn.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,  -- 5MB cap
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy "avatar images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users can replace their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users can delete their own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- update_profile_identity: additive extension, backward-compatible.
-- Two independent toggles (default true) let the avatar-upload action touch
-- ONLY avatar_image_url and the bio-save action touch ONLY bio, without
-- clobbering the other field. Existing two-positional-arg callers are
-- unaffected (both flags default true = old all-or-nothing behavior).
-- ---------------------------------------------------------------------------
create or replace function update_profile_identity(
  p_bio text default null,
  p_avatar_image_url text default null,
  p_update_bio boolean default true,
  p_update_avatar boolean default true
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

  update profiles
     set bio = case when p_update_bio
                 then nullif(trim(coalesce(p_bio, '')), '')
                 else bio
               end,
         avatar_image_url = case when p_update_avatar
                              then nullif(trim(coalesce(p_avatar_image_url, '')), '')
                              else avatar_image_url
                            end
   where id = v_actor;
end;
$$;
