alter table public.posts
  add column if not exists publish_to_brickboard boolean not null default true,
  add column if not exists brickboard_copy text check (brickboard_copy is null or char_length(brickboard_copy) <= 280),
  add column if not exists scheduled_at timestamptz,
  add column if not exists scheduled_by uuid references auth.users(id) on delete set null,
  add column if not exists archived_at timestamptz,
  add column if not exists last_autosaved_at timestamptz;

create index if not exists posts_scheduled_idx
  on public.posts (scheduled_at)
  where scheduled_at is not null and is_published = false and archived_at is null;

create index if not exists posts_archived_idx
  on public.posts (archived_at)
  where archived_at is not null;

create table if not exists public.post_versions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  snapshot jsonb not null,
  label text not null default 'Versão salva',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists post_versions_post_created_idx
  on public.post_versions (post_id, created_at desc);

alter table public.post_versions enable row level security;

create policy post_versions_admin_select on public.post_versions
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

create policy post_versions_admin_insert on public.post_versions
  for insert to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

grant select, insert on public.post_versions to authenticated;
