begin;

create or replace function public.telegram_publish_review(p_review_key text, p_actor_id text)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  state public.bot_state%rowtype;
  review jsonb;
  item jsonb;
  post public.posts%rowtype;
  result jsonb := '[]'::jsonb;
  stamp timestamptz;
  previous timestamptz;
begin
  if auth.jwt() ->> 'role' is distinct from 'service_role' then
    raise exception using errcode = '42501', message = 'Publicação pelo Telegram restrita ao servidor autorizado.';
  end if;
  if p_review_key !~ '^telegram:publish-review:[0-9a-f-]{36}$' then
    raise exception using errcode = '22023', message = 'Confirmação inválida.';
  end if;
  perform pg_advisory_xact_lock(72817, 1);
  select s.* into state from public.bot_state s where s.key = p_review_key for update;
  if not found then raise exception using errcode = '40001', message = 'Confirmação expirada ou cancelada. Revise as matérias novamente.'; end if;
  review := state.value::jsonb;
  if review ->> 'actor_id' is distinct from p_actor_id then raise exception using errcode = '42501', message = 'Administrador não autorizado para esta confirmação.'; end if;
  if review ->> 'status' = 'published' then return review -> 'result'; end if;
  if review ->> 'images_verified' is distinct from 'true' or review ->> 'status' is distinct from 'pending' or (review ->> 'expires_at')::timestamptz < clock_timestamp()
    or jsonb_typeof(review -> 'posts') is distinct from 'array' or jsonb_array_length(review -> 'posts') not between 1 and 50 then
    raise exception using errcode = '40001', message = 'Confirmação expirada. Revise as matérias novamente.';
  end if;
  perform 1 from public.posts p where p.id in (select (entry ->> 'id')::uuid from jsonb_array_elements(review -> 'posts') entry) order by p.id for update;
  select max(p.published_at) into previous from public.posts p where p.is_published;
  for item in select entry from jsonb_array_elements(review -> 'posts') entry loop
    select p.* into post from public.posts p where p.id = (item ->> 'id')::uuid;
    if not found or post.is_published or post.archived_at is not null or post.updated_at is distinct from (item ->> 'updated_at')::timestamptz then
      raise exception using errcode = '40001', message = 'Uma matéria foi alterada, arquivada ou já publicada. Revise o lote novamente.';
    end if;
    stamp := greatest(clock_timestamp(), previous + interval '1 millisecond');
    perform set_config('orangebrick.telegram_publication_override', 'confirmed', true);
    update public.posts p set is_published = true, published_at = stamp, updated_at = stamp, scheduled_at = null, scheduled_by = null where p.id = post.id;
    previous := stamp;
    result := result || jsonb_build_array(jsonb_build_object('id', post.id, 'published_at', stamp, 'updated_at', stamp));
  end loop;
  perform set_config('orangebrick.telegram_publication_override', '', true);
  update public.bot_state s set value = coalesce((
    select jsonb_agg(selected.value order by selected.ordinality)
    from jsonb_array_elements(s.value::jsonb) with ordinality selected
    where selected.value #>> '{}' not in (select entry ->> 'id' from jsonb_array_elements(review -> 'posts') entry)
  ), '[]'::jsonb)::text, updated_at = clock_timestamp()
  where s.key = 'telegram:publish-selection:' || p_actor_id;
  review := review || jsonb_build_object('status', 'published', 'result', result);
  update public.bot_state s set value = review::text, updated_at = clock_timestamp() where s.key = p_review_key;
  return result;
end;
$$;

revoke all on function public.telegram_publish_review(text, text) from public, anon, authenticated;
grant execute on function public.telegram_publish_review(text, text) to service_role;

create or replace function public.telegram_toggle_publication_selection(p_actor_id text, p_post_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  selection jsonb;
  state_key text := 'telegram:publish-selection:' || p_actor_id;
begin
  if auth.jwt() ->> 'role' is distinct from 'service_role' then raise exception using errcode = '42501', message = 'Seleção restrita ao servidor do Telegram.'; end if;
  if not exists(select 1 from public.posts where id = p_post_id and is_published is false and archived_at is null) then raise exception 'Matéria não encontrada, arquivada ou já publicada.'; end if;
  insert into public.bot_state (key, value) values (state_key, '[]') on conflict (key) do nothing;
  select s.value::jsonb into selection from public.bot_state s where s.key = state_key for update;
  if selection ? p_post_id::text then
    select coalesce(jsonb_agg(entry.value order by entry.ordinality), '[]'::jsonb) into selection
      from jsonb_array_elements(selection) with ordinality entry where entry.value #>> '{}' <> p_post_id::text;
  else
    if jsonb_array_length(selection) >= 50 then raise exception 'Selecione no máximo cinquenta matérias por lote.'; end if;
    selection := selection || jsonb_build_array(p_post_id::text);
  end if;
  update public.bot_state s set value = selection::text, updated_at = clock_timestamp() where s.key = state_key;
  return selection;
end;
$$;

revoke all on function public.telegram_toggle_publication_selection(text, uuid) from public, anon, authenticated;
grant execute on function public.telegram_toggle_publication_selection(text, uuid) to service_role;

commit;
