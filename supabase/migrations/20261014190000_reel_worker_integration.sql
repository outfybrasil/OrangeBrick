create table if not exists public.reel_jobs (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  expected_updated_at timestamptz not null,
  status text not null default 'queued' check (status in ('queued','running','ready','failed','skipped')),
  attempts integer not null default 0,
  lock_token uuid,
  lease_until timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  started_at timestamptz,
  finished_at timestamptz,
  storage_path text,
  duration numeric,
  file_size bigint,
  script jsonb,
  error text,
  telegram_status text not null default 'pending' check (telegram_status in ('pending','sent','failed','unconfigured'))
);

alter table public.reel_jobs enable row level security;
revoke all on public.reel_jobs from public, anon, authenticated;
grant all on public.reel_jobs to service_role;
create unique index if not exists reel_jobs_active_post_idx on public.reel_jobs(post_id) where status in ('queued','running');
create index if not exists reel_jobs_post_created_idx on public.reel_jobs(post_id,created_at desc);

create or replace function public.enqueue_reel(p_slug text)
returns setof public.reel_jobs language plpgsql set search_path = '' as $$
declare p public.posts;
begin
  select * into p from public.posts where slug=p_slug and is_published and archived_at is null;
  if not found then raise exception 'Matéria publicada não encontrada'; end if;
  perform pg_advisory_xact_lock(hashtextextended('orangebrick-reel-enqueue',0));
  update public.reel_jobs set status='failed',error='A geração anterior expirou. Uma nova solicitação foi criada.',finished_at=clock_timestamp()
    where post_id=p.id and ((status='queued' and created_at<clock_timestamp()-interval '60 minutes')
      or (status='running' and lease_until<clock_timestamp()));
  if exists(select 1 from public.reel_jobs where post_id=p.id and status in ('queued','running')) then
    return query select * from public.reel_jobs where post_id=p.id and status in ('queued','running');
    return;
  end if;
  return query insert into public.reel_jobs(post_id,expected_updated_at) values(p.id,p.updated_at) returning *;
end;
$$;

create or replace function public.claim_reel(p_token uuid)
returns setof public.reel_jobs language plpgsql set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('orangebrick-reel-claim',0));
  update public.reel_jobs set status='failed',error='Renderização interrompida após duas tentativas',finished_at=clock_timestamp()
    where status='running' and lease_until<clock_timestamp() and attempts>=2;
  if exists(select 1 from public.reel_jobs where status='running' and lease_until>clock_timestamp()) then return; end if;
  return query update public.reel_jobs set status='running',attempts=attempts+1,lock_token=p_token,
    started_at=clock_timestamp(),lease_until=clock_timestamp()+interval '30 minutes'
    where id=(select id from public.reel_jobs where status='queued' or (status='running' and lease_until<clock_timestamp()) order by created_at limit 1 for update skip locked) returning *;
end;
$$;

create or replace function public.finish_reel(p_job uuid,p_token uuid,p_path text,p_duration numeric,p_size bigint,p_script jsonb)
returns text language plpgsql set search_path = '' as $$
declare j public.reel_jobs; p public.posts;
begin
  select * into j from public.reel_jobs where id=p_job and status='running' and lock_token=p_token and lease_until>clock_timestamp() for update;
  if not found then raise exception 'Reserva de processamento expirada'; end if;
  select * into p from public.posts where id=j.post_id for share;
  if not found or not p.is_published or p.archived_at is not null or p.updated_at<>j.expected_updated_at then
    update public.reel_jobs set status='skipped',finished_at=clock_timestamp(),error='A matéria mudou durante a geração. Gere novamente.' where id=j.id;
    return 'skipped';
  end if;
  if p_path is null or p_duration is null or p_size is null or p_script is null
    or p_path<>j.post_id::text||'/'||j.id::text||'.mp4'
    or p_duration<=0 or p_duration>120 or p_size<100000 or p_size>104857600 then raise exception 'Arquivo de vídeo inválido'; end if;
  update public.reel_jobs set status='ready',storage_path=p_path,duration=p_duration,file_size=p_size,script=p_script,finished_at=clock_timestamp(),error=null where id=j.id;
  return 'ready';
end;
$$;

create or replace function public.list_reel_jobs(p_post_ids uuid[])
returns setof public.reel_jobs language sql stable set search_path = '' as $$
  select distinct on (post_id) * from public.reel_jobs where post_id=any(p_post_ids) order by post_id,created_at desc,id desc;
$$;

revoke all on function public.enqueue_reel(text),public.claim_reel(uuid),public.finish_reel(uuid,uuid,text,numeric,bigint,jsonb),public.list_reel_jobs(uuid[]) from public,anon,authenticated;
grant execute on function public.enqueue_reel(text),public.claim_reel(uuid),public.finish_reel(uuid,uuid,text,numeric,bigint,jsonb),public.list_reel_jobs(uuid[]) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('editorial-reels','editorial-reels',false,104857600,array['video/mp4']) on conflict(id) do nothing;
