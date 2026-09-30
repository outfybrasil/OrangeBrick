alter table public.community_comments
  add column if not exists parent_id uuid;

create unique index if not exists community_comments_id_post_unique_idx
  on public.community_comments (id, post_id);

create index if not exists community_comments_parent_created_idx
  on public.community_comments (parent_id, created_at);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'community_comments_parent_post_fkey'
      and conrelid = 'public.community_comments'::regclass
  ) then
    alter table public.community_comments
      add constraint community_comments_parent_post_fkey
      foreign key (parent_id, post_id)
      references public.community_comments (id, post_id)
      on delete cascade;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'community_comments'
  ) then
    alter publication supabase_realtime add table public.community_comments;
  end if;
end;
$$;
