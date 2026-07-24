create table if not exists public.editorial_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete set null,
  kind text not null default 'cover' check (kind in ('cover', 'body', 'release')),
  source_url text not null,
  storage_path text not null unique,
  public_url text not null,
  alt_text text,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  file_size integer not null check (file_size > 0),
  mime_type text not null default 'image/webp',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists editorial_images_post_id_idx
  on public.editorial_images (post_id, created_at desc);

create index if not exists editorial_images_created_at_idx
  on public.editorial_images (created_at desc);

alter table public.editorial_images enable row level security;

drop policy if exists editorial_images_admin_read on public.editorial_images;
create policy editorial_images_admin_read on public.editorial_images
  for select to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false));

drop policy if exists editorial_images_admin_insert on public.editorial_images;
create policy editorial_images_admin_insert on public.editorial_images
  for insert to authenticated
  with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false));

drop policy if exists editorial_images_admin_update on public.editorial_images;
create policy editorial_images_admin_update on public.editorial_images
  for update to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false))
  with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false));

drop policy if exists editorial_images_admin_delete on public.editorial_images;
create policy editorial_images_admin_delete on public.editorial_images
  for delete to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false));

grant select, insert, update, delete on public.editorial_images to authenticated;
