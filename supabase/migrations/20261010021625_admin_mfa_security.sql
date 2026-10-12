begin;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'role' = 'service_role', false)
    or (
      coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false)
      and coalesce(auth.jwt() ->> 'aal' = 'aal2', false)
    );
$$;

revoke execute on function public.current_user_is_admin() from public, anon;
grant execute on function public.current_user_is_admin() to authenticated, service_role;

do $$
declare
  target record;
begin
  for target in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and c.relrowsecurity
  loop
    execute format(
      'create policy admin_requires_mfa on public.%I as restrictive for all to authenticated
       using (not coalesce((auth.jwt() -> ''app_metadata'' ->> ''is_admin'')::boolean, false)
              or coalesce(auth.jwt() ->> ''aal'' = ''aal2'', false))
       with check (not coalesce((auth.jwt() -> ''app_metadata'' ->> ''is_admin'')::boolean, false)
                   or coalesce(auth.jwt() ->> ''aal'' = ''aal2'', false))',
      target.relname
    );
  end loop;
end;
$$;

commit;
