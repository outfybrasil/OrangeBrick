create table if not exists public.topics (
  id text primary key check (id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 160),
  kind text not null default 'game' check (kind in ('game', 'subject')),
  description text check (description is null or char_length(description) <= 280),
  image_url text check (image_url is null or image_url ~ '^https://'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.posts
  add column if not exists topic_id text references public.topics(id) on delete set null;

alter table public.release_radar_items
  add column if not exists topic_id text references public.topics(id) on delete set null;

alter table public.community_posts
  add column if not exists topic_id text references public.topics(id) on delete set null,
  add column if not exists source_post_id uuid references public.posts(id) on delete cascade,
  add column if not exists is_official_thread boolean not null default false;

alter table public.community_polls
  add column if not exists prompt_date date,
  add column if not exists is_active boolean not null default true;

create unique index if not exists community_posts_source_post_idx
  on public.community_posts (source_post_id)
  where source_post_id is not null and is_official_thread = true;

create index if not exists posts_topic_idx on public.posts (topic_id, published_at desc);
create index if not exists release_radar_topic_idx on public.release_radar_items (topic_id);
create index if not exists community_posts_topic_idx on public.community_posts (topic_id, created_at desc);
create unique index if not exists community_polls_prompt_date_idx
  on public.community_polls (prompt_date)
  where prompt_date is not null;

insert into public.topics (id, name, kind, description, image_url, is_active)
select
  release.id,
  release.game,
  'game',
  'Matérias, lançamentos e conversas sobre ' || release.game || '.',
  release.image_url,
  release.is_active
from public.release_radar_items release
on conflict (id) do update set
  name = excluded.name,
  image_url = coalesce(excluded.image_url, public.topics.image_url),
  is_active = excluded.is_active,
  updated_at = now();

update public.release_radar_items
set topic_id = id
where topic_id is null;

update public.posts post
set topic_id = release.topic_id
from public.release_radar_items release
where release.post_slug = post.slug
  and post.topic_id is null;

update public.community_polls
set prompt_date = created_at::date
where prompt_date is null;

alter table public.topics enable row level security;

drop policy if exists topics_public_read on public.topics;
create policy topics_public_read on public.topics
  for select to anon, authenticated
  using (is_active = true or coalesce((select auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false));

drop policy if exists topics_admin_insert on public.topics;
create policy topics_admin_insert on public.topics
  for insert to authenticated
  with check (coalesce((select auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false));

drop policy if exists topics_admin_update on public.topics;
create policy topics_admin_update on public.topics
  for update to authenticated
  using (coalesce((select auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false))
  with check (coalesce((select auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false));

drop policy if exists topics_admin_delete on public.topics;
create policy topics_admin_delete on public.topics
  for delete to authenticated
  using (coalesce((select auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false));

drop policy if exists community_polls_admin_insert on public.community_polls;
create policy community_polls_admin_insert on public.community_polls
  for insert to authenticated
  with check (coalesce((select auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false));

drop policy if exists community_polls_admin_update on public.community_polls;
create policy community_polls_admin_update on public.community_polls
  for update to authenticated
  using (coalesce((select auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false))
  with check (coalesce((select auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false));

drop policy if exists community_polls_admin_delete on public.community_polls;
create policy community_polls_admin_delete on public.community_polls
  for delete to authenticated
  using (coalesce((select auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false));

grant select on public.topics to anon;
grant select, insert, update, delete on public.topics to authenticated;
grant insert, update, delete on public.community_polls to authenticated;
