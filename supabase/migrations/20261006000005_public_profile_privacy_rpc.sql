create or replace function public.public_profile_safe(target_username text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_result jsonb;
  activity_stats_visible boolean;
begin
  profile_result := public.public_profile(target_username);
  if profile_result is null then return null; end if;

  select profile.show_activity_stats
  into activity_stats_visible
  from public.profiles as profile
  where profile.user_id = (profile_result->>'user_id')::uuid;

  if not coalesce(activity_stats_visible, false) then
    profile_result := jsonb_set(profile_result, '{progress,active_days}', 'null'::jsonb, false);
  end if;

  return profile_result;
end;
$$;

revoke all on function public.public_profile(text) from public, anon, authenticated;
revoke all on function public.public_profile_safe(text) from public, anon, authenticated;
grant execute on function public.public_profile_safe(text) to anon, authenticated;

notify pgrst, 'reload schema';
