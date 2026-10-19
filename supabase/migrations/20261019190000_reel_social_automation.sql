create table public.reel_social_automation (
  id boolean primary key default true check (id),
  activated_at timestamptz not null default clock_timestamp()
);

insert into public.reel_social_automation(id) values (true);

alter table public.reel_social_automation enable row level security;
revoke all on public.reel_social_automation from public, anon, authenticated;
grant select on public.reel_social_automation to service_role;

create table public.reel_social_publications (
  post_id uuid not null references public.posts(id) on delete cascade,
  platform text not null check (platform in ('instagram', 'tiktok', 'youtube')),
  reel_job_id uuid not null references public.reel_jobs(id),
  status text not null check (status in ('processing', 'submitted', 'published', 'failed', 'unknown')),
  external_id text,
  error text,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (post_id, platform)
);

alter table public.reel_social_publications enable row level security;
revoke all on public.reel_social_publications from public, anon, authenticated;
grant select, insert, update on public.reel_social_publications to service_role;
create index reel_social_publications_status_idx on public.reel_social_publications(status, updated_at);
