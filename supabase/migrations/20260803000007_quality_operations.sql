create table if not exists public.community_note_votes (
  note_id uuid not null references public.community_notes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (note_id, user_id)
);

alter table public.community_note_votes enable row level security;
create policy "note votes are public" on public.community_note_votes for select using (true);
create policy "users manage own note votes" on public.community_note_votes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.sync_community_note_helpful_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.community_notes set helpful_count = (select count(*) from public.community_note_votes where note_id = coalesce(new.note_id, old.note_id)) where id = coalesce(new.note_id, old.note_id);
  return coalesce(new, old);
end;
$$;
create trigger sync_community_note_helpful_count_trigger after insert or delete on public.community_note_votes for each row execute function public.sync_community_note_helpful_count();

create table if not exists public.backup_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null check (status in ('started', 'verified', 'failed')),
  manifest jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  verified_at timestamptz
);
alter table public.backup_runs enable row level security;
create policy "admins read backup runs" on public.backup_runs for select using (public.is_current_admin());

create or replace function public.apply_retention_policy()
returns jsonb language plpgsql security definer set search_path = public as $$
declare deleted_trash integer; deleted_notifications integer; deleted_logs integer;
begin
  delete from public.admin_trash where expires_at < now(); get diagnostics deleted_trash = row_count;
  delete from public.notifications where created_at < now() - interval '90 days'; get diagnostics deleted_notifications = row_count;
  delete from public.admin_audit_log where created_at < now() - interval '365 days'; get diagnostics deleted_logs = row_count;
  return jsonb_build_object('trash', deleted_trash, 'notifications', deleted_notifications, 'audit_logs', deleted_logs);
end;
$$;

create or replace function public.audit_post_changes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and public.is_current_admin() then
    insert into public.admin_audit_log(actor_id, action, target_type, target_id, details)
    values (auth.uid(), lower(tg_op), 'post', coalesce(new.id, old.id)::text, jsonb_build_object('published', case when tg_op = 'DELETE' then old.is_published else new.is_published end));
  end if;
  return coalesce(new, old);
end;
$$;
drop trigger if exists audit_post_changes_trigger on public.posts;
create trigger audit_post_changes_trigger after insert or update or delete on public.posts for each row execute function public.audit_post_changes();

grant execute on function public.apply_retention_policy() to service_role;
