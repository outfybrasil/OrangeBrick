create table if not exists public.app_error_events (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  severity text not null default 'error' check (severity in ('warning', 'error')),
  reference text,
  route text,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.app_error_events enable row level security;

drop policy if exists "Admins read app errors" on public.app_error_events;
create policy "Admins read app errors"
on public.app_error_events
for select
to authenticated
using (public.current_user_is_admin());

grant select, delete on public.app_error_events to authenticated;

create or replace function public.record_app_error(
  target_source text,
  target_message text,
  target_route text default null,
  target_reference text default null,
  target_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_error_events (source, message, route, reference, metadata)
  values (
    left(coalesce(target_source, 'web'), 80),
    left(coalesce(target_message, 'Erro não identificado'), 500),
    left(target_route, 300),
    left(target_reference, 160),
    coalesce(target_metadata, '{}'::jsonb)
  );

  delete from public.app_error_events
  where created_at < now() - interval '90 days';
end;
$$;

revoke all on function public.record_app_error(text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.record_app_error(text, text, text, text, jsonb) to service_role;

