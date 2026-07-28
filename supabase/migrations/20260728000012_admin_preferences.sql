create table if not exists public.admin_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_author text not null default 'Redação' check (char_length(default_author) between 1 and 80),
  default_category text not null default 'breaking' check (default_category in ('breaking', 'hardware', 'industry', 'modding', 'review', 'opinion')),
  updated_at timestamptz not null default now()
);

alter table public.admin_preferences enable row level security;

create policy admin_preferences_own_read on public.admin_preferences
  for select to authenticated
  using (auth.uid() = user_id and coalesce((select auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false));

create policy admin_preferences_own_insert on public.admin_preferences
  for insert to authenticated
  with check (auth.uid() = user_id and coalesce((select auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false));

create policy admin_preferences_own_update on public.admin_preferences
  for update to authenticated
  using (auth.uid() = user_id and coalesce((select auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false))
  with check (auth.uid() = user_id and coalesce((select auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false));

grant select, insert, update on public.admin_preferences to authenticated;
