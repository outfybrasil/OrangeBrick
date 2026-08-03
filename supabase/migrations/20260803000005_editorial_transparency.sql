alter table public.posts add column if not exists information_status text not null default 'confirmed' check (information_status in ('confirmed', 'developing', 'rumor', 'updated', 'corrected'));
alter table public.posts add column if not exists featured_quote jsonb;
alter table public.posts add column if not exists editorial_sources jsonb not null default '[]'::jsonb;
alter table public.posts add column if not exists correction_note text;

create table if not exists public.editorial_revisions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  editor_id uuid references auth.users(id) on delete set null,
  change_type text not null,
  previous_status text,
  next_status text,
  correction_note text,
  created_at timestamptz not null default now()
);

alter table public.editorial_revisions enable row level security;
create policy "published revision history is public" on public.editorial_revisions for select using (exists (select 1 from public.posts where posts.id = post_id and posts.is_published = true));

create or replace function public.record_editorial_revision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.information_status is distinct from old.information_status or new.correction_note is distinct from old.correction_note or new.title is distinct from old.title or new.summary is distinct from old.summary or new.body is distinct from old.body then
    insert into public.editorial_revisions (post_id, editor_id, change_type, previous_status, next_status, correction_note)
    values (
      new.id,
      auth.uid(),
      case when new.correction_note is distinct from old.correction_note and new.correction_note is not null then 'correction' else 'update' end,
      old.information_status,
      new.information_status,
      new.correction_note
    );
  end if;
  return new;
end;
$$;

drop trigger if exists record_editorial_revision_trigger on public.posts;
create trigger record_editorial_revision_trigger
after update on public.posts
for each row execute function public.record_editorial_revision();

create index if not exists editorial_revisions_post_idx on public.editorial_revisions(post_id, created_at desc);
