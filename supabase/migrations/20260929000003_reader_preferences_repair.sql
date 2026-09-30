begin;

create table if not exists public.user_follows (
  user_id uuid not null references auth.users(id) on delete cascade,
  follow_type text not null check (follow_type in ('topic', 'platform', 'profile')),
  follow_value text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, follow_type, follow_value)
);

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  breaking_news boolean not null default true,
  followed_topics boolean not null default true,
  brickboard_replies boolean not null default true,
  weekly_digest boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.user_follows enable row level security;
alter table public.notification_preferences enable row level security;

drop policy if exists reader_follows_owner on public.user_follows;
create policy reader_follows_owner on public.user_follows for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists reader_preferences_owner on public.notification_preferences;
create policy reader_preferences_owner on public.notification_preferences for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

revoke all on public.user_follows, public.notification_preferences from anon;
grant select, insert, update, delete on public.user_follows, public.notification_preferences to authenticated;
grant all on public.user_follows, public.notification_preferences to service_role;

create index if not exists user_follows_value_idx on public.user_follows(follow_type, follow_value);
notify pgrst, 'reload schema';

commit;
