
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  summary text,
  cover_image_url text,
  hero_image_url text,
  release_date date,
  release_status text not null default 'tba'
    check (release_status in ('tba','announced','released','delayed','cancelled')),
  platforms text[] not null default '{}',
  genres text[] not null default '{}',
  developer text,
  publisher text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists games_release_date_idx
  on public.games (release_date);

create index if not exists games_active_name_idx
  on public.games (is_active, name);

alter table public.games enable row level security;

grant select on public.games to anon, authenticated;
grant insert, update, delete on public.games to service_role;

create policy "games_public_read"
  on public.games
  for select
  to anon, authenticated
  using (is_active = true);

create table if not exists public.game_posts (
  game_id uuid not null references public.games(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  relation_type text not null default 'news'
    check (relation_type in ('news','review','guide','opinion','announcement','other')),
  created_at timestamptz not null default now(),
  primary key (game_id, post_id)
);

create index if not exists game_posts_post_id_idx
  on public.game_posts (post_id);

alter table public.game_posts enable row level security;

grant select on public.game_posts to anon, authenticated;
grant insert, update, delete on public.game_posts to service_role;

create policy "game_posts_public_read"
  on public.game_posts
  for select
  to anon, authenticated
  using (true);

create table if not exists public.game_community_posts (
  game_id uuid not null references public.games(id) on delete cascade,
  community_post_id uuid not null references public.community_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (game_id, community_post_id)
);

create index if not exists game_community_posts_post_id_idx
  on public.game_community_posts (community_post_id);

alter table public.game_community_posts enable row level security;

grant select on public.game_community_posts to anon, authenticated;
grant insert, update, delete on public.game_community_posts to service_role;

create policy "game_community_posts_public_read"
  on public.game_community_posts
  for select
  to anon, authenticated
  using (true);

create table if not exists public.user_game_tracking (
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  status text not null
    check (status in ('garanti','radar','passo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

create index if not exists user_game_tracking_game_id_idx
  on public.user_game_tracking (game_id);

alter table public.user_game_tracking enable row level security;

grant select, insert, update, delete on public.user_game_tracking to authenticated;

create policy "user_game_tracking_own_select"
  on public.user_game_tracking
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "user_game_tracking_own_insert"
  on public.user_game_tracking
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "user_game_tracking_own_update"
  on public.user_game_tracking
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "user_game_tracking_own_delete"
  on public.user_game_tracking
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

alter table public.release_radar_items
  add column if not exists game_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'release_radar_items_game_id_fkey'
      and conrelid = 'public.release_radar_items'::regclass
  ) then
    alter table public.release_radar_items
      add constraint release_radar_items_game_id_fkey
      foreign key (game_id)
      references public.games(id)
      on delete set null;
  end if;
end $$;

create index if not exists release_radar_items_game_id_idx
  on public.release_radar_items (game_id);
;
