insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-images', 'profile-images', true, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "profile images are public" on storage.objects;
create policy "profile images are public" on storage.objects for select using (bucket_id = 'profile-images');
