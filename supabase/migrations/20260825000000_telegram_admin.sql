alter table public.community_moderation_actions
  alter column moderator_id drop not null;

grant execute on function public.admin_resolve_community_report(uuid, text) to service_role;
grant execute on function public.admin_restore_community_user(uuid) to service_role;

create or replace function public.admin_moderate_user(
  target_user_id uuid,
  target_action text,
  target_reason text default null,
  target_days integer default 7
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_is_admin() then
    raise exception 'Acesso negado.';
  end if;

  if target_action not in ('suspend_7d', 'ban', 'restore') then
    raise exception 'Ação de moderação inválida.';
  end if;

  if not exists (select 1 from public.profiles where id = target_user_id) then
    raise exception 'Usuário não encontrado.';
  end if;

  if target_action = 'suspend_7d' then
    update public.profiles
    set community_suspended_until = now() + make_interval(days => greatest(target_days, 1)),
        community_banned = false,
        community_moderation_reason = coalesce(nullif(btrim(target_reason), ''), 'Suspensão aplicada pela moderação')
    where id = target_user_id;
  elsif target_action = 'ban' then
    update public.profiles
    set community_banned = true,
        community_suspended_until = null,
        community_moderation_reason = coalesce(nullif(btrim(target_reason), ''), 'Bloqueio aplicado pela moderação')
    where id = target_user_id;
  else
    update public.profiles
    set community_banned = false,
        community_suspended_until = null,
        community_moderation_reason = null
    where id = target_user_id;
  end if;

  insert into public.community_moderation_actions (
    moderator_id,
    target_user_id,
    action,
    reason
  ) values (
    auth.uid(),
    target_user_id,
    target_action,
    nullif(btrim(coalesce(target_reason, '')), '')
  );
end;
$$;

revoke all on function public.admin_moderate_user(uuid, text, text, integer) from public;
grant execute on function public.admin_moderate_user(uuid, text, text, integer) to authenticated, service_role;

create table if not exists public.bot_state (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.bot_state enable row level security;
