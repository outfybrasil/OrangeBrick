begin;

create or replace function public.article_comment_like_summaries(target_comment_ids uuid[])
returns table (
  comment_id uuid,
  likes_count bigint,
  user_has_liked boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if coalesce(cardinality(target_comment_ids), 0) > 200 then
    raise exception 'No máximo 200 comentários por consulta.' using errcode = '22023';
  end if;

  return query
  select
    requested.comment_id,
    count(like_row.id),
    coalesce(bool_or(like_row.user_id = (select auth.uid())), false)
  from (
    select distinct unnest(coalesce(target_comment_ids, '{}'::uuid[])) as comment_id
  ) as requested
  join public.comments as comment_row
    on comment_row.id = requested.comment_id
  join public.posts as article
    on article.id = comment_row.post_id
    and article.is_published
  left join public.article_comment_likes as like_row
    on like_row.comment_id = comment_row.id
  group by requested.comment_id;
end;
$$;

revoke all on function public.article_comment_like_summaries(uuid[]) from public, anon, authenticated;
grant execute on function public.article_comment_like_summaries(uuid[]) to anon, authenticated, service_role;

create or replace function public.set_article_comment_like(target_comment_id uuid, should_like boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
begin
  current_user_id := (select auth.uid());
  if current_user_id is null then
    raise exception 'Autenticação necessária.' using errcode = '28000';
  end if;

  if should_like is null then
    raise exception 'Ação de curtida inválida.' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.comments as comment_row
    join public.posts as article
      on article.id = comment_row.post_id
    where comment_row.id = target_comment_id
      and article.is_published
  ) then
    raise exception 'Comentário indisponível.' using errcode = 'P0002';
  end if;

  if should_like then
    insert into public.article_comment_likes (comment_id, user_id)
    values (target_comment_id, current_user_id)
    on conflict (comment_id, user_id) do nothing;
  else
    delete from public.article_comment_likes
    where comment_id = target_comment_id
      and user_id = current_user_id;
  end if;
end;
$$;

revoke all on function public.set_article_comment_like(uuid, boolean) from public, anon, authenticated;
grant execute on function public.set_article_comment_like(uuid, boolean) to authenticated, service_role;

drop policy if exists article_comment_likes_select on public.article_comment_likes;
revoke all on table public.article_comment_likes from public, anon, authenticated;
grant all on table public.article_comment_likes to service_role;

notify pgrst, 'reload schema';

commit;
