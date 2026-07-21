create extension if not exists pgcrypto;

create table if not exists public.post_views (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  device_id text not null check (char_length(device_id) between 16 and 128),
  ip_hash text,
  viewed_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null,
  p256dh_key text not null,
  auth_key text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.rate_limits (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  identity_hash text not null,
  window_start timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  unique (action, identity_hash, window_start)
);

alter table public.reactions add column if not exists ip_hash text;
alter table public.post_views add column if not exists ip_hash text;
alter table public.contact_submissions add column if not exists ip_hash text;
alter table public.contact_submissions alter column created_at set default now();

delete from public.reactions a
using public.reactions b
where a.ctid < b.ctid
  and a.post_id = b.post_id
  and a.device_id = b.device_id;

delete from public.reactions a
using public.reactions b
where a.ctid < b.ctid
  and a.post_id = b.post_id
  and a.ip_hash = b.ip_hash
  and a.ip_hash is not null;

delete from public.post_views a
using public.post_views b
where a.ctid < b.ctid
  and a.post_id = b.post_id
  and a.device_id = b.device_id;

delete from public.push_subscriptions a
using public.push_subscriptions b
where a.ctid < b.ctid
  and a.endpoint = b.endpoint;

create unique index if not exists reactions_post_device_key on public.reactions (post_id, device_id);
create unique index if not exists reactions_post_ip_key on public.reactions (post_id, ip_hash) where ip_hash is not null;
create index if not exists reactions_post_id_idx on public.reactions (post_id);
create unique index if not exists post_views_post_device_key on public.post_views (post_id, device_id);
create unique index if not exists post_views_post_ip_key on public.post_views (post_id, ip_hash) where ip_hash is not null;
create index if not exists post_views_post_id_idx on public.post_views (post_id);
create unique index if not exists push_subscriptions_endpoint_key on public.push_subscriptions (endpoint);
create index if not exists comments_post_id_idx on public.comments (post_id);
create index if not exists rate_limits_cleanup_idx on public.rate_limits (window_start);

alter table public.posts enable row level security;
alter table public.reactions enable row level security;
alter table public.comments enable row level security;
alter table public.post_views enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.contact_submissions enable row level security;
alter table public.rate_limits enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
declare
  item record;
begin
  for item in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('posts', 'reactions', 'comments', 'post_views', 'push_subscriptions', 'contact_submissions', 'rate_limits')
  loop
    execute format('drop policy if exists %I on %I.%I', item.policyname, item.schemaname, item.tablename);
  end loop;
end
$$;

create policy posts_public_read on public.posts
  for select to anon, authenticated
  using (is_published = true or (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

create policy posts_admin_insert on public.posts
  for insert to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

create policy posts_admin_update on public.posts
  for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true)
  with check ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

create policy posts_admin_delete on public.posts
  for delete to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

create policy comments_public_read on public.comments
  for select to anon, authenticated
  using (true);

create policy comments_user_insert on public.comments
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and char_length(btrim(content)) between 1 and 500
    and exists (
      select 1 from public.posts
      where posts.id = comments.post_id
        and posts.is_published = true
    )
  );

revoke all on public.reactions, public.post_views, public.push_subscriptions, public.contact_submissions, public.rate_limits from anon, authenticated;
grant select on public.posts, public.comments to anon, authenticated;
grant insert on public.comments to authenticated;
grant insert, update, delete on public.posts to authenticated;

create or replace function public.consume_rate_limit(
  p_action text,
  p_identity_hash text,
  p_window_start timestamptz,
  p_limit integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '2 days';
  end if;
  insert into public.rate_limits (action, identity_hash, window_start, request_count)
  values (p_action, p_identity_hash, p_window_start, 1)
  on conflict (action, identity_hash, window_start)
  do update set request_count = public.rate_limits.request_count + 1
  returning request_count into current_count;
  return current_count <= p_limit;
end;
$$;

revoke all on function public.consume_rate_limit(text, text, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, text, timestamptz, integer) to service_role;
