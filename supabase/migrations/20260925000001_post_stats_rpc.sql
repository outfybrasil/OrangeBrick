create or replace function public.get_post_stats(p_post_ids uuid[], p_device_id text default null)
returns table (
  post_id uuid,
  hype bigint,
  flop bigint,
  salty bigint,
  views bigint,
  comments bigint,
  user_reaction text
)
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select
    post.id,
    count(reaction.id) filter (where reaction.reaction_type = 'hype')::bigint,
    count(reaction.id) filter (where reaction.reaction_type = 'flop')::bigint,
    count(reaction.id) filter (where reaction.reaction_type = 'salty')::bigint,
    (select count(*) from public.post_views as view where view.post_id = post.id),
    (select count(*) from public.comments as comment where comment.post_id = post.id),
    (
      select current_reaction.reaction_type::text
      from public.reactions as current_reaction
      where current_reaction.post_id = post.id
        and current_reaction.device_id = p_device_id
      limit 1
    )
  from public.posts as post
  left join public.reactions as reaction on reaction.post_id = post.id
  where post.id = any(coalesce(p_post_ids, array[]::uuid[]))
    and post.is_published = true
  group by post.id
$$;

revoke all on function public.get_post_stats(uuid[], text) from public, anon, authenticated;
grant execute on function public.get_post_stats(uuid[], text) to service_role;
