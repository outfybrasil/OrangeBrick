create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  author_avatar text not null default '',
  content text not null check (char_length(content) between 1 and 280),
  media_url text check (media_url is null or media_url ~ '^https?://'),
  platform_tag text check (platform_tag is null or platform_tag in ('[PS5]', '[XSX]', '[SWITCH 2]', '[PC]', '[MOBILE]')),
  attached_article jsonb,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists community_posts_created_at_idx on public.community_posts (created_at desc);
create index if not exists community_posts_pinned_idx on public.community_posts (is_pinned desc, created_at desc);

create table if not exists public.community_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction_type text not null check (reaction_type in ('hype', 'flop', 'salty')),
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create index if not exists community_reactions_post_idx on public.community_reactions (post_id);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  author_avatar text not null default '',
  content text not null check (char_length(content) between 1 and 280),
  created_at timestamptz not null default now()
);

create index if not exists community_comments_post_idx on public.community_comments (post_id, created_at);

create table if not exists public.community_polls (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  options jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create table if not exists public.community_poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.community_polls(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  option_index int not null,
  created_at timestamptz not null default now(),
  unique (poll_id, user_id)
);

alter table public.community_posts enable row level security;
alter table public.community_reactions enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_polls enable row level security;
alter table public.community_poll_votes enable row level security;

drop policy if exists community_posts_select on public.community_posts;
create policy community_posts_select on public.community_posts
  for select to anon, authenticated
  using (true);

drop policy if exists community_posts_insert on public.community_posts;
create policy community_posts_insert on public.community_posts
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists community_posts_delete on public.community_posts;
create policy community_posts_delete on public.community_posts
  for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists community_reactions_select on public.community_reactions;
create policy community_reactions_select on public.community_reactions
  for select to anon, authenticated
  using (true);

drop policy if exists community_reactions_insert on public.community_reactions;
create policy community_reactions_insert on public.community_reactions
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists community_reactions_delete on public.community_reactions;
create policy community_reactions_delete on public.community_reactions
  for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists community_comments_select on public.community_comments;
create policy community_comments_select on public.community_comments
  for select to anon, authenticated
  using (true);

drop policy if exists community_comments_insert on public.community_comments;
create policy community_comments_insert on public.community_comments
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists community_comments_delete on public.community_comments;
create policy community_comments_delete on public.community_comments
  for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists community_polls_select on public.community_polls;
create policy community_polls_select on public.community_polls
  for select to anon, authenticated
  using (true);

drop policy if exists community_poll_votes_select on public.community_poll_votes;
create policy community_poll_votes_select on public.community_poll_votes
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists community_poll_votes_insert on public.community_poll_votes;
create policy community_poll_votes_insert on public.community_poll_votes
  for insert to authenticated
  with check (auth.uid() = user_id);

grant select, insert on public.community_posts to anon, authenticated;
grant delete on public.community_posts to authenticated;
grant select, insert, delete on public.community_reactions to authenticated;
grant select, insert on public.community_comments to anon, authenticated;
grant delete on public.community_comments to authenticated;
grant select on public.community_polls to anon, authenticated;
grant select, insert on public.community_poll_votes to authenticated;
