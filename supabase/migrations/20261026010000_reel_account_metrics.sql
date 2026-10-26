create table if not exists public.reel_account_metrics (
  platform text not null check (platform in ('instagram', 'tiktok', 'youtube')),
  captured_on date not null,
  captured_at timestamptz not null default clock_timestamp(),
  followers bigint check (followers is null or followers >= 0),
  following bigint check (following is null or following >= 0),
  total_posts bigint check (total_posts is null or total_posts >= 0),
  total_views bigint check (total_views is null or total_views >= 0),
  total_likes bigint check (total_likes is null or total_likes >= 0),
  error text,
  primary key (platform, captured_on)
);

alter table public.reel_account_metrics enable row level security;
revoke all on public.reel_account_metrics from public, anon, authenticated;
grant select, insert, update on public.reel_account_metrics to service_role;
create index if not exists reel_account_metrics_captured_idx on public.reel_account_metrics(captured_on desc, platform);
