begin;

create or replace function public.admin_publish_posts(p_post_ids uuid[], p_expected_updated timestamptz[])
returns table (id uuid, published_at timestamptz, updated_at timestamptz)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_post public.posts%rowtype;
  v_id uuid;
  v_index integer;
  v_time timestamptz;
  v_previous timestamptz;
begin
  if auth.uid() is null or auth.jwt() ->> 'role' is distinct from 'authenticated'
    or not public.current_user_is_admin() or auth.jwt() ->> 'aal' is distinct from 'aal2' then
    raise exception using errcode = '42501', message = 'Acesso administrativo com dois fatores obrigatório.';
  end if;
  if coalesce(cardinality(p_post_ids), 0) not between 1 and 50
    or cardinality(p_post_ids) is distinct from cardinality(p_expected_updated)
    or array_position(p_post_ids, null) is not null
    or array_position(p_expected_updated, null) is not null
    or (select count(distinct item) from unnest(p_post_ids) item) <> cardinality(p_post_ids) then
    raise exception using errcode = '22023', message = 'Selecione de uma a cinquenta matérias distintas.';
  end if;
  perform pg_advisory_xact_lock(72817, 1);
  perform 1 from public.posts p where p.id = any(p_post_ids) order by p.id for update;
  select max(p.published_at) into v_previous from public.posts p where p.is_published;
  for v_index in 1..cardinality(p_post_ids) loop
    v_id := p_post_ids[v_index];
    select p.is_published, p.updated_at into v_post.is_published, v_post.updated_at from public.posts p where p.id = v_id;
    if not found or v_post.is_published or v_post.updated_at is distinct from p_expected_updated[v_index] then
      raise exception using errcode = '40001', message = 'Uma matéria foi alterada ou publicada por outra pessoa. Revise a seleção novamente.';
    end if;
    v_time := greatest(clock_timestamp(), v_previous + interval '1 millisecond');
    perform set_config('orangebrick.manual_publication_override', 'confirmed', true);
    update public.posts p set is_published = true, published_at = v_time, updated_at = v_time,
      scheduled_at = null, scheduled_by = null where p.id = v_id;
    v_previous := v_time;
    id := v_id; published_at := v_time; updated_at := v_time;
    return next;
  end loop;
  perform set_config('orangebrick.manual_publication_override', '', true);
end;
$$;

create or replace function public.admin_save_editorial_post(p_id uuid, p_post jsonb)
returns table (id uuid, published_at timestamptz, updated_at timestamptz)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_post public.posts%rowtype;
  v_existing public.posts%rowtype;
  v_time timestamptz;
begin
  if auth.uid() is null or auth.jwt() ->> 'role' is distinct from 'authenticated'
    or not public.current_user_is_admin() or auth.jwt() ->> 'aal' is distinct from 'aal2' then
    raise exception using errcode = '42501', message = 'Acesso administrativo com dois fatores obrigatório.';
  end if;
  if jsonb_typeof(p_post) is distinct from 'object' or p_post ->> 'is_published' is distinct from 'true' then
    raise exception using errcode = '22023', message = 'Confirme a publicação da matéria.';
  end if;
  perform pg_advisory_xact_lock(72817, 1);
  if p_id is not null then
    select p.is_published, p.published_at, p.updated_at into v_existing.is_published, v_existing.published_at, v_existing.updated_at from public.posts p where p.id = p_id for update;
    if not found then raise exception using errcode = 'P0002', message = 'Matéria não encontrada.'; end if;
    if p_post ->> 'expected_updated_at' is null or v_existing.updated_at is distinct from (p_post ->> 'expected_updated_at')::timestamptz then
      raise exception using errcode = '40001', message = 'A matéria foi alterada por outra pessoa. Reabra o editor antes de publicar.';
    end if;
  end if;
  v_post := jsonb_populate_record(null::public.posts, p_post);
  if btrim(coalesce(v_post.title, '')) = '' or btrim(coalesce(v_post.slug, '')) = '' then
    raise exception using errcode = '22023', message = 'Informe título e slug para identificar a matéria.';
  end if;
  if v_existing.is_published then
    v_time := v_existing.published_at;
  else
    select greatest(clock_timestamp(), max(p.published_at) + interval '1 millisecond') into v_time from public.posts p where p.is_published;
  end if;
  perform set_config('orangebrick.manual_publication_override', 'confirmed', true);
  if p_id is null then
    insert into public.posts (slug, title, summary, body, category, image_url, image_alt, author_name, author_tag,
      topic_id, information_status, featured_quote, editorial_sources, short_article_reason, correction_note,
      is_published, published_at, updated_at, scheduled_at, scheduled_by)
    values (v_post.slug, v_post.title, v_post.summary, v_post.body, v_post.category, v_post.image_url, v_post.image_alt,
      v_post.author_name, v_post.author_tag, v_post.topic_id, v_post.information_status, v_post.featured_quote,
      v_post.editorial_sources, v_post.short_article_reason, v_post.correction_note, true, v_time, clock_timestamp(), null, null)
    returning posts.id into p_id;
  else
    update public.posts p set slug = v_post.slug, title = v_post.title, summary = v_post.summary,
      body = v_post.body, category = v_post.category, image_url = v_post.image_url, image_alt = v_post.image_alt,
      author_name = v_post.author_name, author_tag = v_post.author_tag, topic_id = v_post.topic_id,
      information_status = v_post.information_status, featured_quote = v_post.featured_quote,
      editorial_sources = v_post.editorial_sources, short_article_reason = v_post.short_article_reason,
      correction_note = v_post.correction_note, is_published = true, published_at = v_time,
      updated_at = clock_timestamp(), scheduled_at = null, scheduled_by = null where p.id = p_id;
  end if;
  perform set_config('orangebrick.manual_publication_override', '', true);
  return query select p.id, p.published_at, p.updated_at from public.posts p where p.id = p_id;
end;
$$;

revoke all on function public.admin_publish_posts(uuid[], timestamptz[]) from public, anon, service_role;
revoke all on function public.admin_save_editorial_post(uuid, jsonb) from public, anon, service_role;
grant execute on function public.admin_publish_posts(uuid[], timestamptz[]) to authenticated;
grant execute on function public.admin_save_editorial_post(uuid, jsonb) to authenticated;

create index if not exists posts_publication_order_idx on public.posts (published_at desc nulls last, id desc) where is_published;

commit;
