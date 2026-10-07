alter table public.comments
  add column if not exists parent_id uuid;

create or replace function public.prevent_nested_article_comment()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent_parent_id uuid;
begin
  if new.parent_id is null then
    return new;
  end if;

  select parent.parent_id
    into parent_parent_id
  from public.comments as parent
  where parent.id = new.parent_id
    and parent.post_id = new.post_id;

  if found and parent_parent_id is not null then
    raise exception 'Respostas devem apontar para um comentário principal.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function public.prevent_nested_community_comment()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent_parent_id uuid;
begin
  if new.parent_id is null then
    return new;
  end if;

  select parent.parent_id
    into parent_parent_id
  from public.community_comments as parent
  where parent.id = new.parent_id
    and parent.post_id = new.post_id;

  if found and parent_parent_id is not null then
    raise exception 'Respostas devem apontar para um comentário principal.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists comments_reply_depth_guard on public.comments;
create trigger comments_reply_depth_guard
before insert or update of parent_id, post_id on public.comments
for each row execute function public.prevent_nested_article_comment();

drop trigger if exists community_comments_reply_depth_guard on public.community_comments;
create trigger community_comments_reply_depth_guard
before insert or update of parent_id, post_id on public.community_comments
for each row execute function public.prevent_nested_community_comment();
