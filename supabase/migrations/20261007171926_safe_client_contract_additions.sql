alter table public.posts add column if not exists short_article_reason text;
alter table public.community_posts add column if not exists media_alt text;
alter table public.community_comments add column if not exists author_username text;

create or replace function public.community_comment_sync_author_username()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select profile.username
  into new.author_username
  from public.profiles as profile
  where profile.user_id = new.user_id;
  return new;
end;
$$;

revoke all on function public.community_comment_sync_author_username() from public, anon, authenticated;

drop trigger if exists community_comments_sync_author_username on public.community_comments;
create trigger community_comments_sync_author_username
before insert or update of user_id, author_username on public.community_comments
for each row execute function public.community_comment_sync_author_username();

update public.community_comments as comment_row
set author_username = profile.username
from public.profiles as profile
where comment_row.user_id = profile.user_id
  and comment_row.author_username is distinct from profile.username;

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

create or replace function public.public_profile_safe(target_username text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_result jsonb;
  activity_stats_visible boolean;
begin
  profile_result := public.public_profile(target_username);
  if profile_result is null then return null; end if;

  select profile.show_activity_stats
  into activity_stats_visible
  from public.profiles as profile
  where profile.user_id = (profile_result->>'user_id')::uuid;

  if not coalesce(activity_stats_visible, false) then
    profile_result := jsonb_set(profile_result, '{progress,active_days}', 'null'::jsonb, false);
  end if;

  return profile_result;
end;
$$;

revoke all on function public.public_profile_safe(text) from public, anon, authenticated;
grant execute on function public.public_profile_safe(text) to anon, authenticated;

notify pgrst, 'reload schema';
