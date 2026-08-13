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

create table if not exists public.community_note_votes (
  note_id uuid not null references public.community_notes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (note_id, user_id)
);

alter table public.community_notes enable row level security;
alter table public.community_note_votes enable row level security;

do $$ begin
  create policy "helpful notes are public" on public.community_notes for select using (status = 'helpful' or auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "authenticated users submit notes" on public.community_notes for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "note votes are public" on public.community_note_votes for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "users manage own note votes" on public.community_note_votes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

create index if not exists community_notes_post_idx on public.community_notes(post_id, status, helpful_count desc);

create or replace function public.sync_community_note_helpful_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.community_notes
  set helpful_count = (select count(*) from public.community_note_votes where note_id = coalesce(new.note_id, old.note_id))
  where id = coalesce(new.note_id, old.note_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists sync_community_note_helpful_count_trigger on public.community_note_votes;
create trigger sync_community_note_helpful_count_trigger after insert or delete on public.community_note_votes for each row execute function public.sync_community_note_helpful_count();
