create table public.reel_youtube_publications (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  reel_job_id uuid not null references public.reel_jobs(id),
  channel_id text not null,
  status text not null check (status in ('preparing','uploading','uploaded','unknown','failed')),
  title text not null,
  description text not null,
  visibility text not null check (visibility in ('public','unlisted','private')),
  video_id text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (post_id, channel_id)
);
alter table public.reel_youtube_publications enable row level security;
revoke all on public.reel_youtube_publications from public, anon, authenticated;
grant select, insert, update on public.reel_youtube_publications to service_role;
