begin;

create or replace function public.get_community_comment_like_summaries(target_comment_ids uuid[])
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
  join public.community_comments as comment_row
    on comment_row.id = requested.comment_id
  left join public.community_comment_likes as like_row
    on like_row.comment_id = comment_row.id
  group by requested.comment_id;
end;
$$;

revoke all on function public.get_community_comment_like_summaries(uuid[]) from public, anon, authenticated;
grant execute on function public.get_community_comment_like_summaries(uuid[]) to anon, authenticated, service_role;

drop policy if exists community_comment_likes_select on public.community_comment_likes;
create policy community_comment_likes_select on public.community_comment_likes
  for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.community_comment_likes from public, anon, authenticated;
grant select, insert, delete on public.community_comment_likes to authenticated;
grant select on public.community_comment_likes to service_role;

notify pgrst, 'reload schema';

commit;
