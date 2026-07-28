alter table public.profiles
  add column if not exists community_suspended_until timestamptz,
  add column if not exists community_banned boolean not null default false,
  add column if not exists community_moderation_reason text;

create table if not exists public.community_moderation_actions (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid not null references auth.users(id) on delete restrict,
  target_user_id uuid references auth.users(id) on delete set null,
  report_id uuid references public.community_reports(id) on delete set null,
  action text not null check (action in ('dismiss', 'delete', 'suspend_7d', 'ban', 'restore')),
  reason text,
  created_at timestamptz not null default now()
);

alter table public.community_moderation_actions enable row level security;

drop policy if exists "Admins manage moderation actions" on public.community_moderation_actions;
create policy "Admins manage moderation actions"
on public.community_moderation_actions
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

grant select, insert on public.community_moderation_actions to authenticated;

create or replace function public.assert_community_participation_allowed(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_profile public.profiles%rowtype;
begin
  select * into target_profile
  from public.profiles
  where id = target_user_id;

  if coalesce(target_profile.community_banned, false) then
    raise exception 'Sua participação no Brickboard foi bloqueada pela moderação.';
  end if;

  if target_profile.community_suspended_until is not null
     and target_profile.community_suspended_until > now() then
    raise exception 'Sua participação no Brickboard está suspensa até %.',
      to_char(target_profile.community_suspended_until at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI');
  end if;
end;
$$;

create or replace function public.enforce_community_daily_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  daily_count integer;
  daily_limit integer;
begin
  if public.current_user_is_admin() then
    return new;
  end if;

  perform public.assert_community_participation_allowed(auth.uid());

  if tg_table_name = 'community_posts' then
    daily_limit := 10;
    select count(*) into daily_count from public.community_posts
    where user_id = auth.uid() and created_at >= date_trunc('day', now());
  elsif tg_table_name = 'community_comments' then
    daily_limit := 40;
    select count(*) into daily_count from public.community_comments
    where user_id = auth.uid() and created_at >= date_trunc('day', now());
  elsif tg_table_name = 'community_reactions' then
    daily_limit := 100;
    select count(*) into daily_count from public.community_reactions
    where user_id = auth.uid() and created_at >= date_trunc('day', now());
  else
    daily_limit := 100;
    select count(*) into daily_count from public.community_comment_likes
    where user_id = auth.uid() and created_at >= date_trunc('day', now());
  end if;

  if daily_count >= daily_limit then
    raise exception 'Limite diário atingido. Volte amanhã para continuar participando.';
  end if;

  return new;
end;
$$;

create or replace function public.admin_resolve_community_report(
  target_report_id uuid,
  target_action text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_report public.community_reports%rowtype;
  content_owner uuid;
begin
  if not public.current_user_is_admin() then
    raise exception 'Acesso negado.';
  end if;

  if target_action not in ('dismiss', 'delete', 'suspend_7d', 'ban') then
    raise exception 'Ação de moderação inválida.';
  end if;

  select * into target_report
  from public.community_reports
  where id = target_report_id
  for update;

  if target_report.id is null or target_report.status <> 'pending' then
    raise exception 'Esta denúncia já foi resolvida ou não existe.';
  end if;

  if target_report.content_type = 'post' then
    select user_id into content_owner
    from public.community_posts
    where id = target_report.content_id;
  else
    select user_id into content_owner
    from public.community_comments
    where id = target_report.content_id;
  end if;

  if target_action in ('delete', 'suspend_7d', 'ban') then
    if target_report.content_type = 'post' then
      delete from public.community_posts where id = target_report.content_id;
    else
      delete from public.community_comments where id = target_report.content_id;
    end if;
  end if;

  if target_action = 'suspend_7d' and content_owner is not null then
    update public.profiles
    set community_suspended_until = now() + interval '7 days',
        community_moderation_reason = target_report.reason
    where id = content_owner;
  elsif target_action = 'ban' and content_owner is not null then
    update public.profiles
    set community_banned = true,
        community_suspended_until = null,
        community_moderation_reason = target_report.reason
    where id = content_owner;
  end if;

  update public.community_reports
  set status = case when target_action = 'dismiss' then 'dismissed' else 'actioned' end,
      reviewed_at = now(),
      reviewed_by = auth.uid()
  where id = target_report_id;

  insert into public.community_moderation_actions (
    moderator_id,
    target_user_id,
    report_id,
    action,
    reason
  ) values (
    auth.uid(),
    content_owner,
    target_report_id,
    target_action,
    target_report.reason
  );
end;
$$;

create or replace function public.admin_restore_community_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_is_admin() then
    raise exception 'Acesso negado.';
  end if;

  update public.profiles
  set community_banned = false,
      community_suspended_until = null,
      community_moderation_reason = null
  where id = target_user_id;

  insert into public.community_moderation_actions (
    moderator_id,
    target_user_id,
    action
  ) values (
    auth.uid(),
    target_user_id,
    'restore'
  );
end;
$$;

revoke all on function public.admin_resolve_community_report(uuid, text) from public;
revoke all on function public.admin_restore_community_user(uuid) from public;
grant execute on function public.admin_resolve_community_report(uuid, text) to authenticated;
grant execute on function public.admin_restore_community_user(uuid) to authenticated;

