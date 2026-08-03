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

create table if not exists public.community_notes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 40 and 500),
  source_url text not null,
  status text not null default 'pending' check (status in ('pending', 'helpful', 'rejected')),
  helpful_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.game_clubs (
  id uuid primary key default gen_random_uuid(),
  topic_id text not null references public.topics(id) on delete cascade,
  name text not null,
  description text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(topic_id, name)
);

create table if not exists public.game_club_members (
  club_id uuid not null references public.game_clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (club_id, user_id)
);

alter table public.user_follows enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.community_notes enable row level security;
alter table public.game_clubs enable row level security;
alter table public.game_club_members enable row level security;

create policy "follows are readable by owner" on public.user_follows for select using (auth.uid() = user_id);
create policy "follows are managed by owner" on public.user_follows for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "preferences are readable by owner" on public.notification_preferences for select using (auth.uid() = user_id);
create policy "preferences are managed by owner" on public.notification_preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "helpful notes are public" on public.community_notes for select using (status = 'helpful' or auth.uid() = user_id);
create policy "authenticated users submit notes" on public.community_notes for insert with check (auth.uid() = user_id);
create policy "clubs are public" on public.game_clubs for select using (true);
create policy "authenticated users create clubs" on public.game_clubs for insert with check (auth.uid() = created_by);
create policy "club membership is public" on public.game_club_members for select using (true);
create policy "users manage club membership" on public.game_club_members for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists user_follows_value_idx on public.user_follows(follow_type, follow_value);
create index if not exists community_notes_post_idx on public.community_notes(post_id, status, helpful_count desc);
create index if not exists game_clubs_topic_idx on public.game_clubs(topic_id);
