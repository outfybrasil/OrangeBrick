-- Pontos de interesse por matéria (reações + views) agregados no Postgres.
-- Substitui o download integral de reactions/post_views pela página /em-alta.

create or replace function public.get_post_interest_scores()
returns table (post_id uuid, interest_score bigint)
language sql
stable
security definer
set search_path = public
as $$
  with reaction_scores as (
    select r.post_id, sum(case when r.reaction_type = 'hype' then 4 else 2 end)::bigint as score
    from public.reactions r
    group by r.post_id
  ),
  view_scores as (
    select v.post_id, count(*)::bigint as score
    from public.post_views v
    group by v.post_id
  )
  select coalesce(rs.post_id, vs.post_id),
         coalesce(rs.score, 0) + coalesce(vs.score, 0)
  from reaction_scores rs
  full outer join view_scores vs on vs.post_id = rs.post_id
$$;

revoke all on function public.get_post_interest_scores() from public, anon, authenticated;
grant execute on function public.get_post_interest_scores() to service_role;
