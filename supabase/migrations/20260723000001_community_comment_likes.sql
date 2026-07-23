create table if not exists public.community_comment_likes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.community_comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (comment_id, user_id)
);

create index if not exists community_comment_likes_comment_idx on public.community_comment_likes (comment_id);

alter table public.community_comment_likes enable row level security;

drop policy if exists community_comment_likes_select on public.community_comment_likes;
create policy community_comment_likes_select on public.community_comment_likes
  for select to anon, authenticated
  using (true);

drop policy if exists community_comment_likes_insert on public.community_comment_likes;
create policy community_comment_likes_insert on public.community_comment_likes
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists community_comment_likes_delete on public.community_comment_likes;
create policy community_comment_likes_delete on public.community_comment_likes
  for delete to authenticated
  using (auth.uid() = user_id);

grant select, insert, delete on public.community_comment_likes to anon, authenticated;
