create or replace function public.claim_report_alert_lock(p_lock_token uuid, p_lock_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  was_acquired boolean;
begin
  if p_lock_token is null or p_lock_seconds is null or p_lock_seconds not between 10 and 300 then
    raise exception 'Parâmetros inválidos para o lock de alertas';
  end if;

  insert into public.bot_state as current_lock (key, value, updated_at)
  values ('tg_report_alert_lock', p_lock_token::text, pg_catalog.clock_timestamp())
  on conflict (key) do update
  set value = excluded.value,
      updated_at = excluded.updated_at
  where current_lock.updated_at <= pg_catalog.clock_timestamp() - pg_catalog.make_interval(secs => p_lock_seconds)
  returning true into was_acquired;

  return coalesce(was_acquired, false);
end;
$$;

create or replace function public.renew_report_alert_lock(p_lock_token uuid, p_lock_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  was_renewed boolean;
begin
  if p_lock_token is null or p_lock_seconds is null or p_lock_seconds not between 10 and 300 then
    raise exception 'Parâmetros inválidos para o lock de alertas';
  end if;

  update public.bot_state
  set updated_at = pg_catalog.clock_timestamp()
  where key = 'tg_report_alert_lock'
    and value = p_lock_token::text
    and updated_at >= pg_catalog.clock_timestamp() - pg_catalog.make_interval(secs => p_lock_seconds)
  returning true into was_renewed;

  return coalesce(was_renewed, false);
end;
$$;

create or replace function public.release_report_alert_lock(p_lock_token uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_rows integer;
begin
  if p_lock_token is null then
    raise exception 'Token inválido para liberar o lock de alertas';
  end if;

  delete from public.bot_state
  where key = 'tg_report_alert_lock'
    and value = p_lock_token::text;

  get diagnostics deleted_rows = row_count;
  return deleted_rows = 1;
end;
$$;

revoke all on function public.claim_report_alert_lock(uuid, integer) from public, anon, authenticated;
revoke all on function public.renew_report_alert_lock(uuid, integer) from public, anon, authenticated;
revoke all on function public.release_report_alert_lock(uuid) from public, anon, authenticated;
grant execute on function public.claim_report_alert_lock(uuid, integer) to service_role;
grant execute on function public.renew_report_alert_lock(uuid, integer) to service_role;
grant execute on function public.release_report_alert_lock(uuid) to service_role;

notify pgrst, 'reload schema';
