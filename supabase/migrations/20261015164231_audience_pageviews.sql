create table public.audience_pageviews (
  id uuid primary key,
  path text not null check (length(path) between 1 and 220),
  visitor_hash text not null check (visitor_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now()
);
alter table public.audience_pageviews enable row level security;
revoke all on public.audience_pageviews from public, anon, authenticated;
grant select, insert on public.audience_pageviews to service_role;
create index audience_pageviews_created_at_idx on public.audience_pageviews(created_at);
create or replace function public.admin_site_metrics(p_days integer default 7)
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
  if p_days not in (7,30,90) or p_days is null then raise exception 'Invalid period'; end if;
  end_at := statement_timestamp();
  start_at := (((end_at at time zone 'America/Sao_Paulo')::date - (p_days - 1))::timestamp at time zone 'America/Sao_Paulo');
  with visits as materialized (
    select path, visitor_hash, (created_at at time zone 'America/Sao_Paulo')::date as day
    from public.audience_pageviews where created_at >= start_at and created_at <= end_at
  ), days as (
    select ((start_at at time zone 'America/Sao_Paulo')::date + n)::date as day from generate_series(0,p_days-1) as n
  ), daily as (
    select day, count(*) as views, count(distinct visitor_hash) as visitors from visits group by day
  ), top_pages as (
    select path, count(*) as views from visits group by path order by views desc, path limit 10
  )
  select jsonb_build_object(
    'visitors',(select count(distinct visitor_hash) from visits),
    'pageviews',(select count(*) from visits),
    'daily',(select jsonb_agg(jsonb_build_object('day',d.day,'views',coalesce(v.views,0),'visitors',coalesce(v.visitors,0)) order by d.day) from days d left join daily v using(day)),
    'pages',(select coalesce(jsonb_agg(jsonb_build_object('path',path,'views',views) order by views desc,path),'[]'::jsonb) from top_pages)
  ) into result;
  return result;
end;
$$;
revoke all on function public.admin_site_metrics(integer) from public, anon, authenticated;
grant execute on function public.admin_site_metrics(integer) to service_role;
