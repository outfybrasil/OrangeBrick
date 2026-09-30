create unique index if not exists comments_id_post_unique_idx
  on public.comments (id, post_id);

create index if not exists comments_parent_created_idx
  on public.comments (parent_id, created_at);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'comments_parent_post_fkey'
      and conrelid = 'public.comments'::regclass
  ) then
    alter table public.comments
      add constraint comments_parent_post_fkey
      foreign key (parent_id, post_id)
      references public.comments (id, post_id)
      on delete cascade;
  end if;
end;
$$;
