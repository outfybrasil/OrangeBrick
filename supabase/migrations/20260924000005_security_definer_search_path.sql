revoke create on schema public from public, anon, authenticated;

do $$
declare
  function_row record;
begin
  for function_row in
    select
      p.oid::regprocedure as signature,
      p.prokind
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n
      on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and p.prokind in ('f', 'p')
  loop
    if function_row.prokind = 'p' then
      execute format(
        'alter procedure %s set search_path = pg_catalog, public, pg_temp',
        function_row.signature
      );
    else
      execute format(
        'alter function %s set search_path = pg_catalog, public, pg_temp',
        function_row.signature
      );
    end if;
  end loop;
end
$$;

notify pgrst, 'reload schema';
