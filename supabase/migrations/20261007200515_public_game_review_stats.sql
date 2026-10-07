create or replace function public.get_game_review_stats(target_game_ids uuid[])
returns table (
  game_id uuid,
  average_rating numeric,
  rating_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    requested.game_id,
    pg_catalog.round(pg_catalog.avg(tracking.rating), 1) as average_rating,
    pg_catalog.count(tracking.user_id) as rating_count
  from (
    select distinct requested_ids.game_id
    from pg_catalog.unnest(target_game_ids) as requested_ids(game_id)
    where pg_catalog.cardinality(target_game_ids) between 1 and 100
  ) as requested
  join public.games as catalog
    on catalog.id = requested.game_id
  left join public.user_game_tracking as tracking
    on tracking.game_id = requested.game_id
    and tracking.status = 'joguei'
    and tracking.is_public is true
    and tracking.rating is not null
  group by requested.game_id;
$$;

revoke execute on function public.get_game_review_stats(uuid[]) from public;
revoke execute on function public.get_game_review_stats(uuid[]) from anon, authenticated;
grant execute on function public.get_game_review_stats(uuid[]) to anon, authenticated;
