begin;

create table public.editorial_review_jobs (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null,
  post_id uuid not null references public.posts(id) on delete cascade,
  expected_updated_at timestamptz not null,
  actor_id text not null,
  channel text not null check (channel in ('admin', 'telegram')),
  status text not null default 'queued' check (status in ('queued','running','completed','needs_review','failed','skipped')),
  attempts integer not null default 0,
  lock_token uuid,
  lease_until timestamptz,
  report jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default clock_timestamp(),
  finished_at timestamptz
);

alter table public.editorial_review_jobs enable row level security;
revoke all on public.editorial_review_jobs from public, anon, authenticated;
grant select, insert, update, delete on public.editorial_review_jobs to service_role;
create unique index editorial_review_active_post_idx on public.editorial_review_jobs(post_id) where status in ('queued','running');
create index editorial_review_queue_idx on public.editorial_review_jobs(created_at,id) where status in ('queued','running');
create index editorial_review_batch_idx on public.editorial_review_jobs(batch_id,created_at);
create index editorial_review_post_idx on public.editorial_review_jobs(post_id,created_at);

create function public.enqueue_editorial_reviews(p_ids uuid[],p_actor text,p_channel text)
returns setof public.editorial_review_jobs
language plpgsql security invoker set search_path = pg_catalog, public as $$
declare batch uuid := gen_random_uuid(); target uuid; version timestamptz; scheduled boolean;
begin
  if auth.jwt()->>'role' is distinct from 'service_role' then raise exception using errcode='42501',message='Acesso interno obrigatório.'; end if;
  if cardinality(p_ids) is null or cardinality(p_ids) not between 1 and 50 or array_position(p_ids,null) is not null
    or (select count(distinct id) from unnest(p_ids) id) <> cardinality(p_ids)
    or p_channel not in ('admin','telegram') or coalesce(length(p_actor),0) not between 1 and 100 then
    raise exception using errcode='22023',message='Seleção de revisão inválida.';
  end if;
  perform pg_advisory_xact_lock(72817,2);
  foreach target in array p_ids loop
    select p.updated_at,p.scheduled_at is not null into version,scheduled from public.posts p where p.id=target and not p.is_published and p.archived_at is null for update;
    if not found then continue; end if;
    if exists(select 1 from public.editorial_review_jobs where post_id=target and status in ('queued','running')) then continue; end if;
    if scheduled then
      update public.posts set scheduled_at=null,scheduled_by=null,updated_at=clock_timestamp() where id=target returning updated_at into version;
    end if;
    insert into public.editorial_review_jobs(batch_id,post_id,expected_updated_at,actor_id,channel)
      values(batch,target,version,p_actor,p_channel) on conflict (post_id) where status in ('queued','running') do nothing;
  end loop;
  return query select j.* from public.editorial_review_jobs j where j.post_id=any(p_ids) and j.status in ('queued','running') order by j.created_at,j.id;
end $$;

create function public.claim_editorial_review(p_token uuid)
returns setof public.editorial_review_jobs
language plpgsql security invoker set search_path = pg_catalog, public as $$
declare target uuid;
begin
  if auth.jwt()->>'role' is distinct from 'service_role' then raise exception using errcode='42501',message='Acesso interno obrigatório.'; end if;
  if p_token is null then raise exception 'Token de revisão obrigatório.'; end if;
  perform pg_advisory_xact_lock(72817,2);
  update public.editorial_review_jobs set status='failed',finished_at=clock_timestamp(),report=jsonb_build_object('title','Revisão interrompida','remaining',jsonb_build_array('A revisão excedeu o tempo disponível. Tente novamente.'))
    where status='running' and lease_until<clock_timestamp() and attempts>=2;
  if exists(select 1 from public.editorial_review_jobs where status='running' and lease_until>=clock_timestamp()) then return; end if;
  select j.id into target from public.editorial_review_jobs j where j.status='queued' or (j.status='running' and j.lease_until<clock_timestamp() and j.attempts<2) order by j.created_at,j.id for update skip locked limit 1;
  if not found then return; end if;
  return query update public.editorial_review_jobs set status='running',attempts=attempts+1,lock_token=p_token,lease_until=clock_timestamp()+interval '6 minutes' where id=target returning *;
end $$;

create function public.finish_editorial_review(p_job uuid,p_token uuid,p_candidate jsonb,p_report jsonb,p_status text)
returns text language plpgsql security invoker set search_path = pg_catalog, public as $$
declare job public.editorial_review_jobs%rowtype; draft public.posts%rowtype; result_status text := p_status;
begin
  if auth.jwt()->>'role' is distinct from 'service_role' then raise exception using errcode='42501',message='Acesso interno obrigatório.'; end if;
  if p_status not in ('completed','needs_review','failed') or jsonb_typeof(p_report) is distinct from 'object' then raise exception 'Resultado de revisão inválido.'; end if;
  select j.* into job from public.editorial_review_jobs j where j.id=p_job and j.status='running' and j.lock_token=p_token and j.lease_until>clock_timestamp() for update;
  if not found then raise exception using errcode='40001',message='Outra revisão assumiu esta tarefa.'; end if;
  select p.* into draft from public.posts p where p.id=job.post_id for update;
  if not found or draft.is_published or draft.archived_at is not null or draft.updated_at is distinct from job.expected_updated_at then
    result_status := 'skipped';
    p_report := jsonb_build_object('title',coalesce(draft.title,'Matéria indisponível'),'remaining',jsonb_build_array('A matéria foi alterada, publicada ou arquivada durante a revisão. Nenhuma alteração automática foi aplicada.'));
  elsif p_candidate is not null then
    if jsonb_typeof(p_candidate) is distinct from 'object' or p_candidate->>'id' is distinct from job.post_id::text
      or p_candidate->>'is_published' is distinct from 'false' then raise exception 'A revisão só pode salvar o mesmo rascunho.'; end if;
    update public.posts set title=p_candidate->>'title',summary=p_candidate->>'summary',body=p_candidate->>'body',
      image_url=p_candidate->>'image_url',image_alt=p_candidate->>'image_alt',information_status=p_candidate->>'information_status',
      featured_quote=p_candidate->'featured_quote',editorial_sources=p_candidate->'editorial_sources',
      short_article_reason=p_candidate->>'short_article_reason',scheduled_at=null,scheduled_by=null,updated_at=clock_timestamp()
      where id=job.post_id;
  end if;
  update public.editorial_review_jobs set status=result_status,report=p_report,finished_at=clock_timestamp(),lease_until=null where id=p_job;
  return result_status;
end $$;

revoke all on function public.enqueue_editorial_reviews(uuid[],text,text) from public,anon,authenticated;
revoke all on function public.claim_editorial_review(uuid) from public,anon,authenticated;
revoke all on function public.finish_editorial_review(uuid,uuid,jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function public.enqueue_editorial_reviews(uuid[],text,text),public.claim_editorial_review(uuid),public.finish_editorial_review(uuid,uuid,jsonb,jsonb,text) to service_role;

commit;
