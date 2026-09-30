create or replace function public.apply_retention_policy()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  deleted_trash integer;
  deleted_notifications integer;
  deleted_logs integer;
  deleted_contact_submissions integer;
begin
  delete from public.admin_trash where expires_at < now();
  get diagnostics deleted_trash = row_count;

  delete from public.notifications where created_at < now() - interval '90 days';
  get diagnostics deleted_notifications = row_count;

  delete from public.admin_audit_log where created_at < now() - interval '365 days';
  get diagnostics deleted_logs = row_count;

  delete from public.contact_submissions where created_at < now() - interval '12 months';
  get diagnostics deleted_contact_submissions = row_count;

  return jsonb_build_object(
    'trash', deleted_trash,
    'notifications', deleted_notifications,
    'audit_logs', deleted_logs,
    'contact_submissions', deleted_contact_submissions
  );
end;
$$;

revoke all on function public.apply_retention_policy() from public, anon, authenticated;
grant execute on function public.apply_retention_policy() to service_role;
