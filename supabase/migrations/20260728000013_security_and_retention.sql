revoke insert on public.home_engagement_events from anon, authenticated;
revoke usage, select on sequence public.home_engagement_events_id_seq from anon, authenticated;

drop policy if exists home_engagement_events_public_insert on public.home_engagement_events;

create or replace function public.cleanup_operational_events()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.home_engagement_events where created_at < now() - interval '90 days';
  delete from public.app_error_events where created_at < now() - interval '30 days';
  delete from public.rate_limits where window_start < now() - interval '7 days';
end;
$$;

revoke all on function public.cleanup_operational_events() from public, anon, authenticated;
grant execute on function public.cleanup_operational_events() to service_role;
