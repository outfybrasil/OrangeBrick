alter table public.reel_social_publications
  add column if not exists platform_media_id text;

alter table public.reel_youtube_publications
  add column if not exists tags text[] not null default '{}',
  add column if not exists verified_tags text[] not null default '{}',
  add column if not exists tags_verified_at timestamptz,
  add column if not exists tags_match boolean;

create table public.reel_social_metrics (
  post_id uuid not null,
  platform text not null check (platform in ('instagram', 'tiktok', 'youtube')),
  captured_on date not null,
  captured_at timestamptz not null default clock_timestamp(),
  views bigint check (views is null or views >= 0),
  reach bigint check (reach is null or reach >= 0),
  average_watch_milliseconds numeric check (average_watch_milliseconds is null or average_watch_milliseconds >= 0),
  watch_time_milliseconds numeric check (watch_time_milliseconds is null or watch_time_milliseconds >= 0),
  likes bigint check (likes is null or likes >= 0),
  comments bigint check (comments is null or comments >= 0),
  shares bigint check (shares is null or shares >= 0),
  saves bigint check (saves is null or saves >= 0),
  follows bigint check (follows is null or follows >= 0),
  interactions bigint check (interactions is null or interactions >= 0),
  error text,
  primary key (post_id, platform, captured_on),
  foreign key (post_id, platform) references public.reel_social_publications(post_id, platform) on delete cascade
);

alter table public.reel_social_metrics enable row level security;
revoke all on public.reel_social_metrics from public, anon, authenticated;
grant select, insert, update on public.reel_social_metrics to service_role;
create index reel_social_metrics_captured_idx on public.reel_social_metrics(captured_on desc, platform);

create table public.reel_social_clicks (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  platform text not null check (platform in ('instagram', 'tiktok', 'youtube')),
  clicked_at timestamptz not null default clock_timestamp()
);

alter table public.reel_social_clicks enable row level security;
revoke all on public.reel_social_clicks from public, anon, authenticated;
grant select, insert on public.reel_social_clicks to service_role;
create index reel_social_clicks_clicked_idx on public.reel_social_clicks(clicked_at desc, platform, post_id);

create or replace function public.admin_reel_social_click_counts(p_days integer default 7)
returns table (post_id uuid, platform text, clicks bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.post_id, c.platform, count(*)
  from public.reel_social_clicks c
  where p_days in (7, 30, 90)
    and c.clicked_at >= statement_timestamp() - make_interval(days => p_days)
  group by c.post_id, c.platform
$$;

revoke all on function public.admin_reel_social_click_counts(integer) from public, anon, authenticated;
grant execute on function public.admin_reel_social_click_counts(integer) to service_role;
