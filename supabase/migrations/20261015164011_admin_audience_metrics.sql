create or replace function public.admin_audience_metrics(p_days integer default 7)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  start_at timestamptz;
  end_at timestamptz;
  result jsonb;
begin
  if p_days not in (7, 30, 90) or p_days is null then
    raise exception 'Invalid period';
  end if;
  end_at := statement_timestamp();
  start_at := (((end_at at time zone 'America/Sao_Paulo')::date - (p_days - 1))::timestamp at time zone 'America/Sao_Paulo');
  with views as materialized (
    select post_id, device_id, (viewed_at at time zone 'America/Sao_Paulo')::date as day
    from public.post_views where viewed_at >= start_at and viewed_at <= end_at
  ), interactions as materialized (
    select post_id, (created_at at time zone 'America/Sao_Paulo')::date as day, 'reaction' as kind
    from public.reactions where created_at >= start_at and created_at <= end_at
    union all
    select post_id, (created_at at time zone 'America/Sao_Paulo')::date as day, 'comment' as kind
    from public.comments where created_at >= start_at and created_at <= end_at
  ), days as (
    select ((start_at at time zone 'America/Sao_Paulo')::date + n)::date as day
    from generate_series(0, p_days - 1) as n
  ), daily_views as (
    select day, count(*) as total from views group by day
  ), daily_interactions as (
    select day, count(*) as total from interactions group by day
  ), top_views as (
    select post_id, count(*) as total from views group by post_id order by total desc, post_id limit 10
  ), top_interactions as (
    select post_id, count(*) as total from interactions group by post_id
  )
  select jsonb_build_object(
    'readers', (select count(distinct device_id) from views),
    'views', (select count(*) from views),
    'reactions', (select count(*) from interactions where kind = 'reaction'),
    'comments', (select count(*) from interactions where kind = 'comment'),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('day', d.day, 'views', coalesce(v.total, 0), 'interactions', coalesce(i.total, 0)) order by d.day), '[]'::jsonb) from days d left join daily_views v using(day) left join daily_interactions i using(day)),
    'top', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'title', p.title, 'slug', p.slug, 'views', v.total, 'interactions', coalesce(i.total, 0)) order by v.total desc, p.id), '[]'::jsonb) from top_views v join public.posts p on p.id = v.post_id left join top_interactions i on i.post_id = p.id)
  ) into result;
  return result;
end;
$$;
revoke all on function public.admin_audience_metrics(integer) from public, anon, authenticated;
grant execute on function public.admin_audience_metrics(integer) to service_role;
