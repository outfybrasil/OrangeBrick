create table if not exists public.release_hype_votes (
  id uuid primary key default gen_random_uuid(),
  release_id text not null references public.release_radar_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  vote_type text not null check (vote_type in ('buy', 'watch', 'skip')),
  created_at timestamptz not null default now(),
  unique (release_id, user_id)
);

create index if not exists release_hype_votes_release_idx
on public.release_hype_votes (release_id, vote_type);

alter table public.release_hype_votes enable row level security;

drop policy if exists release_hype_votes_insert on public.release_hype_votes;
create policy release_hype_votes_insert on public.release_hype_votes
for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists release_hype_votes_update on public.release_hype_votes;
create policy release_hype_votes_update on public.release_hype_votes
for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists release_hype_votes_delete on public.release_hype_votes;
create policy release_hype_votes_delete on public.release_hype_votes
for delete to authenticated
using (auth.uid() = user_id);

create or replace function public.get_release_hype_counts()
returns table (release_id text, vote_type text, vote_count bigint)
language sql
security definer
set search_path = public
as $$
  select release_id, vote_type, count(*)::bigint
  from public.release_hype_votes
  group by release_id, vote_type;
$$;

create or replace function public.get_my_release_hype_votes()
returns table (release_id text, vote_type text)
language sql
security definer
set search_path = public
as $$
  select release_id, vote_type
  from public.release_hype_votes
  where user_id = auth.uid();
$$;

grant select, insert, update, delete on public.release_hype_votes to authenticated;
grant execute on function public.get_release_hype_counts() to anon, authenticated;
grant execute on function public.get_my_release_hype_votes() to authenticated;
