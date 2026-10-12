begin;

create or replace function public.enforce_post_publication_images()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  blocks jsonb;
  image jsonb;
  urls text[];
  count_images integer := 0;
begin
  if new.is_published is not true then return new; end if;
  if not (coalesce(new.image_url, '') ~ '^https://[^[:space:]]+$' or (coalesce(new.image_url, '') ~ '^/[^/]' and position('..' in new.image_url) = 0))
    or char_length(btrim(coalesce(new.image_alt, ''))) < 20 then
    raise exception using errcode = '23514', message = 'A capa é obrigatória e precisa de URL e texto alternativo válidos.';
  end if;
  begin blocks := new.body::jsonb;
  exception when others then raise exception using errcode = '23514', message = 'Não foi possível identificar as duas imagens internas no corpo da notícia.';
  end;
  if jsonb_typeof(blocks) is distinct from 'array' then
    raise exception using errcode = '23514', message = 'A notícia precisa de duas imagens internas em blocos válidos.';
  end if;
  if exists (select 1 from jsonb_array_elements(blocks) item where
    jsonb_typeof(item) is distinct from 'object' or jsonb_typeof(item -> 'id') is distinct from 'string'
    or coalesce(item ->> 'type', '') not in ('text', 'image', 'video')
    or (item ->> 'type' = 'text' and jsonb_typeof(item -> 'content') is distinct from 'string')
    or (item ->> 'type' = 'image' and (jsonb_typeof(item -> 'url') is distinct from 'string' or jsonb_typeof(item -> 'alt') is distinct from 'string' or (item ? 'caption' and jsonb_typeof(item -> 'caption') is distinct from 'string')))
    or (item ->> 'type' = 'video' and (jsonb_typeof(item -> 'url') is distinct from 'string' or jsonb_typeof(item -> 'title') is distinct from 'string' or (item ? 'channelName' and jsonb_typeof(item -> 'channelName') is distinct from 'string') or (item ? 'officialChannelConfirmed' and jsonb_typeof(item -> 'officialChannelConfirmed') is distinct from 'boolean')))
  ) then raise exception using errcode = '23514', message = 'A estrutura do corpo não permite exibir as imagens. Revise os blocos no editor.'; end if;
  urls := array[btrim(new.image_url)];
  for image in select item from jsonb_array_elements(blocks) item where item ->> 'type' = 'image' loop
    count_images := count_images + 1;
    if not (coalesce(image ->> 'url', '') ~ '^https://[^[:space:]]+$' or (coalesce(image ->> 'url', '') ~ '^/[^/]' and position('..' in image ->> 'url') = 0))
      or char_length(btrim(coalesce(image ->> 'alt', ''))) < 20
      or char_length(btrim(coalesce(image ->> 'caption', ''))) < 20 then
      raise exception using errcode = '23514', message = 'Cada imagem interna precisa de URL, texto alternativo e legenda específicos.';
    end if;
    if btrim(image ->> 'url') = any(urls) then
      raise exception using errcode = '23514', message = 'A capa e as imagens internas não podem se repetir.';
    end if;
    urls := array_append(urls, btrim(image ->> 'url'));
  end loop;
  if count_images < 2 then raise exception using errcode = '23514', message = 'A notícia precisa de pelo menos duas imagens internas distintas.'; end if;
  return new;
end;
$$;

revoke all on function public.enforce_post_publication_images() from public, anon;
grant execute on function public.enforce_post_publication_images() to authenticated, service_role;
create trigger enforce_post_publication_images before insert or update of is_published, image_url, image_alt, body on public.posts
for each row execute function public.enforce_post_publication_images();

create or replace function public.enforce_post_publication_quality()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_body jsonb;
  v_block jsonb;
  v_quote jsonb;
  v_source jsonb;
  v_text text := '';
  v_all_content text;
  v_last_text text;
  v_quote_text text;
  v_cited_source_url text;
  v_source_url text;
  v_hostname text;
  v_video_url text;
  v_position bigint;
  v_next_block jsonb;
  v_domains text[] := array[]::text[];
  v_source_urls text[] := array[]::text[];
  v_official_domains text[] := array[
    'nintendo.com', 'nintendo.co.jp', 'playstation.com', 'xbox.com', 'microsoft.com', 'ea.com', 'ubisoft.com',
    'capcom.com', 'capcom-games.com', 'sega.com', 'bandainamcoent.com', 'square-enix.com', 'square-enix-games.com',
    'rockstargames.com', 'bethesda.net', 'activision.com', 'blizzard.com', 'epicgames.com', 'cdprojektred.com', 'konami.com'
  ];
  v_word_count integer := 0;
  v_image_count integer := 0;
  v_distinct_image_count integer := 0;
  v_invalid_image_count integer := 0;
  v_has_official_source boolean := false;
begin
  if coalesce(current_setting('orangebrick.telegram_publication_override', true), '') = 'confirmed'
    and auth.jwt() ->> 'role' = 'service_role' then
    return new;
  end if;

  if coalesce(current_setting('orangebrick.manual_publication_override', true), '') = 'confirmed'
    and auth.uid() is not null
    and auth.jwt() ->> 'role' = 'authenticated'
    and coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false)
    and auth.jwt() ->> 'aal' = 'aal2'
  then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.is_published is true then
      if new.title is not distinct from old.title
        and new.summary is not distinct from old.summary
        and new.image_url is not distinct from old.image_url
        and new.image_alt is not distinct from old.image_alt
        and new.body is not distinct from old.body
        and new.information_status is not distinct from old.information_status
        and new.featured_quote is not distinct from old.featured_quote
        and new.editorial_sources is not distinct from old.editorial_sources
        and new.short_article_reason is not distinct from old.short_article_reason
        and new.correction_note is not distinct from old.correction_note
      then
        return new;
      end if;
    end if;
  end if;

  if new.is_published is not true then
    return new;
  end if;

  if char_length(btrim(coalesce(new.title, ''))) not between 1 and 70 then
    raise exception using errcode = '23514', message = 'O título deve ter entre 1 e 70 caracteres.';
  end if;

  if char_length(btrim(coalesce(new.summary, ''))) not between 80 and 180 then
    raise exception using errcode = '23514', message = 'O resumo deve ter entre 80 e 180 caracteres.';
  end if;

  if not (
    coalesce(new.image_url, '') ~ '^https://[^[:space:]]+$'
    or (coalesce(new.image_url, '') ~ '^/[^/]' and position('..' in new.image_url) = 0)
  ) or char_length(btrim(coalesce(new.image_alt, ''))) < 20 then
    raise exception using errcode = '23514', message = 'A capa precisa de URL válida e texto alternativo.';
  end if;

  begin
    v_body := new.body::jsonb;
  exception when others then
    raise exception using errcode = '23514', message = 'O corpo precisa estar organizado em blocos editoriais válidos.';
  end;

  if coalesce(jsonb_typeof(v_body), '') <> 'array' then
    raise exception using errcode = '23514', message = 'O corpo precisa estar organizado em blocos editoriais válidos.';
  end if;

  v_all_content := concat_ws(' ', coalesce(new.title, ''), coalesce(new.summary, ''), coalesce(new.image_alt, ''), coalesce(new.body, ''));
  if position(chr(65533) in v_all_content) > 0 or exists (
    select 1
      from generate_series(1, char_length(v_all_content)) as char_index(position)
     where ascii(substr(v_all_content, char_index.position, 1)) between 13312 and 19903
        or ascii(substr(v_all_content, char_index.position, 1)) between 19968 and 40959
        or ascii(substr(v_all_content, char_index.position, 1)) between 12352 and 12543
        or ascii(substr(v_all_content, char_index.position, 1)) between 44032 and 55215
        or ascii(substr(v_all_content, char_index.position, 1)) between 131072 and 173791
  ) then
    raise exception using errcode = '23514', message = 'O conteúdo contém caracteres corrompidos ou CJK e precisa ser revisado.';
  end if;

  for v_block, v_position in
    select item.value, item.position
      from jsonb_array_elements(v_body) with ordinality as item(value, position)
  loop
    if jsonb_typeof(v_block) <> 'object' then
      raise exception using errcode = '23514', message = 'O corpo contém blocos editoriais inválidos.';
    end if;

    if v_block ->> 'type' = 'text' then
      v_text := concat_ws(E'\n', nullif(v_text, ''), coalesce(v_block ->> 'content', ''));
    end if;

    if v_block ->> 'type' = 'video' then
      v_video_url := coalesce(v_block ->> 'url', '');
      if not (
        v_video_url ~ '^https://(www\.)?(youtube\.com|m\.youtube\.com)/watch\?v=[A-Za-z0-9_-]{11}([&][^[:space:]]*)?$'
        or v_video_url ~ '^https://(www\.)?youtube\.com/(embed|shorts)/[A-Za-z0-9_-]{11}([?][^[:space:]]*)?$'
        or v_video_url ~ '^https://(www\.)?youtu\.be/[A-Za-z0-9_-]{11}([?][^[:space:]]*)?$'
      ) or char_length(btrim(coalesce(v_block ->> 'title', ''))) < 12
        or char_length(btrim(coalesce(v_block ->> 'channelName', ''))) < 2
        or v_block ->> 'officialChannelConfirmed' is distinct from 'true' then
        raise exception using errcode = '23514', message = 'O vídeo precisa de URL válida, título, canal oficial identificado e confirmação de disponibilidade.';
      end if;

      select item.value
        into v_next_block
        from jsonb_array_elements(v_body) with ordinality as item(value, position)
       where item.position = v_position + 1;
      if coalesce(v_next_block ->> 'type', '') <> 'text' then
        raise exception using errcode = '23514', message = 'O bloco do trailer precisa ser seguido imediatamente por texto.';
      end if;
    end if;
  end loop;

  if char_length(btrim(v_text)) > 0 then
    v_word_count := cardinality(regexp_split_to_array(btrim(v_text), '[[:space:]]+'));
  end if;

  if v_word_count < 700 and char_length(btrim(coalesce(new.short_article_reason, ''))) < 20 then
    raise exception using errcode = '23514', message = 'Matérias com menos de 700 palavras precisam de justificativa editorial.';
  end if;

  select block.value ->> 'content'
    into v_last_text
    from jsonb_array_elements(v_body) with ordinality as block(value, position)
   where block.value ->> 'type' = 'text'
   order by block.position desc
   limit 1;

  if coalesce(v_last_text, '') !~ '\*\*Fonte:\*\*[[:space:]]*\[[^]]+\]\(https://[^)]+\)' then
    raise exception using errcode = '23514', message = 'Inclua a fonte principal no final da matéria.';
  end if;
  v_cited_source_url := (regexp_match(v_last_text, '\*\*Fonte:\*\*[[:space:]]*\[[^]]+\]\((https://[^)]+)\)'))[1];

  select
    count(*)::integer,
    count(distinct block.value ->> 'url')::integer,
    count(*) filter (
      where char_length(btrim(coalesce(block.value ->> 'alt', ''))) < 3
        or char_length(btrim(coalesce(block.value ->> 'caption', ''))) = 0
        or not (
          coalesce(block.value ->> 'url', '') ~ '^https://[^[:space:]]+$'
          or (coalesce(block.value ->> 'url', '') ~ '^/[^/]' and position('..' in coalesce(block.value ->> 'url', '')) = 0)
        )
    )::integer
    into v_image_count, v_distinct_image_count, v_invalid_image_count
    from jsonb_array_elements(v_body) as block(value)
   where block.value ->> 'type' = 'image';

  if v_image_count < 2 or v_distinct_image_count < 2 or v_invalid_image_count > 0 then
    raise exception using errcode = '23514', message = 'A matéria precisa de duas imagens internas distintas, com legenda e texto alternativo.';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(v_body) as block(value)
     where block.value ->> 'type' = 'image'
       and block.value ->> 'url' = new.image_url
  ) then
    raise exception using errcode = '23514', message = 'A capa e as imagens internas precisam ser diferentes.';
  end if;

  if not exists (
    select 1
      from public.editorial_images as image
     where image.public_url = new.image_url
       and image.width >= 1200
       and image.height >= 675
       and abs(image.width::numeric / image.height::numeric - 16::numeric / 9) <= 0.03
  ) or exists (
    select 1
      from jsonb_array_elements(v_body) as block(value)
     where block.value ->> 'type' = 'image'
       and not exists (
         select 1
           from public.editorial_images as image
          where image.public_url = block.value ->> 'url'
            and image.width >= 1200
            and image.height >= 675
            and abs(image.width::numeric / image.height::numeric - 16::numeric / 9) <= 0.03
       )
  ) then
    raise exception using errcode = '23514', message = 'Use imagens da biblioteca editorial com HTTP 200, 16:9 e no mínimo 1200 × 675 pixels.';
  end if;

  if new.information_status is null or new.information_status not in ('confirmed', 'developing', 'rumor', 'updated', 'corrected') then
    raise exception using errcode = '23514', message = 'Defina um estado válido para a informação.';
  end if;

  if jsonb_typeof(new.editorial_sources::jsonb) = 'array' then
    for v_source in select value from jsonb_array_elements(new.editorial_sources::jsonb)
    loop
      v_source_url := btrim(coalesce(v_source ->> 'url', ''));
      if char_length(btrim(coalesce(v_source ->> 'name', ''))) > 0 and v_source_url ~ '^https://[^[:space:]]+$' then
        if array_position(v_source_urls, v_source_url) is null then
          v_source_urls := array_append(v_source_urls, v_source_url);
        end if;
        v_hostname := lower(regexp_replace(split_part(split_part(v_source_url, '/', 3), ':', 1), '^www\.', ''));
        if v_hostname <> '' and array_position(v_domains, v_hostname) is null then
          v_domains := array_append(v_domains, v_hostname);
        end if;
        if v_source ->> 'is_official' = 'true' or exists (
          select 1 from unnest(v_official_domains) as domain(value)
           where v_hostname = domain.value or right(v_hostname, char_length(domain.value) + 1) = '.' || domain.value
        ) then
          v_has_official_source := true;
        end if;
      end if;
    end loop;
  end if;

  if array_position(v_source_urls, v_cited_source_url) is null then
    raise exception using errcode = '23514', message = 'A fonte citada no final também precisa constar nas fontes estruturadas.';
  end if;

  if cardinality(v_domains) < 3 and not v_has_official_source then
    raise exception using errcode = '23514', message = 'Inclua três fontes independentes ou uma fonte oficial.';
  end if;

  if new.information_status = 'rumor' and cardinality(v_domains) = 0 then
    raise exception using errcode = '23514', message = 'Uma matéria marcada como rumor precisa de fonte estruturada.';
  end if;

  if new.information_status = 'corrected' and char_length(btrim(coalesce(new.correction_note, ''))) = 0 then
    raise exception using errcode = '23514', message = 'Explique a correção antes de publicar.';
  end if;

  v_quote := coalesce(new.featured_quote::jsonb, '{}'::jsonb);
  v_quote_text := btrim(coalesce(v_quote ->> 'text', ''));
  if v_quote_text <> '' then
    if char_length(btrim(coalesce(v_quote ->> 'author', ''))) = 0
      or char_length(btrim(coalesce(v_quote ->> 'role', ''))) = 0
      or coalesce(v_quote ->> 'source_url', '') !~ '^https://[^[:space:]]+$'
      or position(v_quote_text in v_text) = 0 then
      raise exception using errcode = '23514', message = 'A fala precisa de autoria, cargo, fonte HTTPS e contexto no corpo.';
    end if;
  elsif v_quote ->> 'absence_registered' is distinct from 'true' then
    raise exception using errcode = '23514', message = 'Registre uma fala verificada ou a ausência de declaração pública relevante.';
  end if;

  return new;
end;
$$;



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
    if not found or post.is_published or post.updated_at is distinct from (item ->> 'updated_at')::timestamptz then
      raise exception using errcode = '40001', message = 'Uma matéria foi alterada ou já publicada. Revise o lote novamente.';
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
  if not exists(select 1 from public.posts where id = p_post_id and is_published is false) then raise exception 'Matéria não encontrada ou já publicada.'; end if;
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
