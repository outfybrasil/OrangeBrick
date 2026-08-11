create table if not exists public.drive_import_registry (
  drive_file_id text primary key,
  post_id uuid references public.posts(id) on delete set null,
  status text not null check (status in ('imported', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.drive_import_registry enable row level security;
revoke all on public.drive_import_registry from anon, authenticated;
