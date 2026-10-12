begin;

create extension if not exists pg_cron;
create extension if not exists pg_net;

create table public.editorial_review_dispatch_auth (
  id boolean primary key default true check (id),
  secret_hash text not null check (length(secret_hash)=64)
);
alter table public.editorial_review_dispatch_auth enable row level security;
revoke all on public.editorial_review_dispatch_auth from public,anon,authenticated;
grant select on public.editorial_review_dispatch_auth to service_role;

do $$
declare dispatch_key text := replace(gen_random_uuid()::text || gen_random_uuid()::text,'-','');
begin
  perform vault.create_secret(dispatch_key,'orangebrick_editorial_review_dispatch','Token exclusivo para retomar a fila editorial do Orange Brick');
  insert into public.editorial_review_dispatch_auth(id,secret_hash) values(true,encode(extensions.digest(dispatch_key,'sha256'),'hex'));
end $$;

create schema if not exists editorial_internal;
revoke all on schema editorial_internal from public,anon,authenticated,service_role;
create function editorial_internal.dispatch_reviews()
returns bigint language plpgsql security invoker set search_path=pg_catalog,public as $$
begin
  if not exists(select 1 from public.editorial_review_jobs where status='queued' or (status='running' and lease_until<clock_timestamp()))
    or exists(select 1 from public.editorial_review_jobs where status='running' and lease_until>=clock_timestamp()) then return null; end if;
  return net.http_post(
    url:='https://orangebrick.blog/api/cron/editorial-review',
    headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='orangebrick_editorial_review_dispatch')),
    body:='{}'::jsonb,
    timeout_milliseconds:=10000
  );
end $$;
revoke all on function editorial_internal.dispatch_reviews() from public,anon,authenticated,service_role;

select cron.schedule('orangebrick-editorial-review','*/5 * * * *','select editorial_internal.dispatch_reviews();');

commit;
