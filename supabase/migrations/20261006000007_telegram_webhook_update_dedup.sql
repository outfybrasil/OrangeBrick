create index if not exists bot_state_tg_webhook_processed_updated_idx
on public.bot_state (updated_at)
where key like 'tg_webhook_update:%' and value like 'processed:%';

create or replace function public.claim_telegram_webhook_update(p_update_id bigint, p_lock_token uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  update_key text;
  current_value text;
  was_acquired boolean;
begin
  if p_update_id is null or p_update_id < 0 or p_lock_token is null then
    raise exception 'Parâmetros inválidos para o update do Telegram';
  end if;

  update_key := 'tg_webhook_update:' || p_update_id::text;

  delete from public.bot_state
  where key like 'tg_webhook_update:%'
    and value like 'processed:%'
    and updated_at <= pg_catalog.clock_timestamp() - interval '30 days';

  insert into public.bot_state as current_update (key, value, updated_at)
  values (update_key, 'processing:' || p_lock_token::text, pg_catalog.clock_timestamp())
  on conflict (key) do update
  set value = excluded.value,
      updated_at = excluded.updated_at
  where current_update.value not like 'processed:%'
    and current_update.updated_at <= pg_catalog.clock_timestamp() - interval '5 minutes'
  returning true into was_acquired;

  if coalesce(was_acquired, false) then
    return 'claimed';
  end if;

  select value into current_value
  from public.bot_state
  where key = update_key;

  if current_value like 'processed:%' then
    return 'processed';
  end if;

  return 'processing';
end;
$$;

create or replace function public.complete_telegram_webhook_update(p_update_id bigint, p_lock_token uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  was_completed boolean;
begin
  if p_update_id is null or p_update_id < 0 or p_lock_token is null then
    raise exception 'Parâmetros inválidos para concluir o update do Telegram';
  end if;

  update public.bot_state
  set value = 'processed:' || p_lock_token::text,
      updated_at = pg_catalog.clock_timestamp()
  where key = 'tg_webhook_update:' || p_update_id::text
    and value = 'processing:' || p_lock_token::text
  returning true into was_completed;

  return coalesce(was_completed, false);
end;
$$;

create or replace function public.release_telegram_webhook_update(p_update_id bigint, p_lock_token uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  was_released boolean;
begin
  if p_update_id is null or p_update_id < 0 or p_lock_token is null then
    raise exception 'Parâmetros inválidos para liberar o update do Telegram';
  end if;

  delete from public.bot_state
  where key = 'tg_webhook_update:' || p_update_id::text
    and value = 'processing:' || p_lock_token::text
  returning true into was_released;

  return coalesce(was_released, false);
end;
$$;

revoke all on function public.claim_telegram_webhook_update(bigint, uuid) from public, anon, authenticated;
revoke all on function public.complete_telegram_webhook_update(bigint, uuid) from public, anon, authenticated;
revoke all on function public.release_telegram_webhook_update(bigint, uuid) from public, anon, authenticated;
grant execute on function public.claim_telegram_webhook_update(bigint, uuid) to service_role;
grant execute on function public.complete_telegram_webhook_update(bigint, uuid) to service_role;
grant execute on function public.release_telegram_webhook_update(bigint, uuid) to service_role;

notify pgrst, 'reload schema';
