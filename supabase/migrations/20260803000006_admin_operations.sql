create table if not exists public.admin_trash (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('post', 'community_post', 'community_comment')),
  content_id text not null,
  snapshot jsonb not null,
  deleted_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  restored_at timestamptz
);

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_trash enable row level security;
alter table public.admin_audit_log enable row level security;

create or replace function public.is_current_admin()
returns boolean language sql stable as $$ select coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) $$;
create policy "admins manage trash" on public.admin_trash for all using (public.is_current_admin()) with check (public.is_current_admin());
create policy "admins read audit log" on public.admin_audit_log for select using (public.is_current_admin());
create policy "admins moderate community notes" on public.community_notes for all using (public.is_current_admin()) with check (public.is_current_admin());

create or replace function public.admin_archive_post(target_post_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare selected_post public.posts%rowtype;
begin
  if not public.is_current_admin() then raise exception 'access denied'; end if;
  select * into selected_post from public.posts where id = target_post_id;
  if selected_post.id is null then raise exception 'post not found'; end if;
  insert into public.admin_trash(content_type, content_id, snapshot, deleted_by) values ('post', selected_post.id::text, to_jsonb(selected_post), auth.uid());
  update public.posts set is_published = false, published_at = null, updated_at = now() where id = target_post_id;
  insert into public.admin_audit_log(actor_id, action, target_type, target_id) values (auth.uid(), 'archive', 'post', target_post_id::text);
end;
$$;

create or replace function public.admin_restore_post(target_trash_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare trash_item public.admin_trash%rowtype;
begin
  if not public.is_current_admin() then raise exception 'access denied'; end if;
  select * into trash_item from public.admin_trash where id = target_trash_id and restored_at is null and expires_at > now();
  if trash_item.id is null then raise exception 'trash item not found'; end if;
  update public.posts set is_published = coalesce((trash_item.snapshot ->> 'is_published')::boolean, false), published_at = (trash_item.snapshot ->> 'published_at')::timestamptz, updated_at = now() where id::text = trash_item.content_id;
  update public.admin_trash set restored_at = now() where id = target_trash_id;
  insert into public.admin_audit_log(actor_id, action, target_type, target_id) values (auth.uid(), 'restore', trash_item.content_type, trash_item.content_id);
end;
$$;

grant execute on function public.admin_archive_post(uuid) to authenticated;
grant execute on function public.admin_restore_post(uuid) to authenticated;
create index if not exists admin_trash_active_idx on public.admin_trash(restored_at, expires_at);
create index if not exists admin_audit_created_idx on public.admin_audit_log(created_at desc);
