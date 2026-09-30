alter default privileges
revoke execute on functions from public;

do $$
declare
  target_function regprocedure;
begin
  for target_function in
    select function_entry.oid::regprocedure
    from pg_proc as function_entry
    join pg_namespace as schema_entry on schema_entry.oid = function_entry.pronamespace
    where schema_entry.nspname = 'public'
      and function_entry.prosecdef
  loop
    execute format(
      'revoke execute on function %s from public, anon, authenticated',
      target_function
    );
  end loop;
end;
$$;

revoke all on function public.current_user_is_admin() from public, anon, authenticated;
grant execute on function public.current_user_is_admin() to authenticated;

revoke all on function public.assert_community_participation_allowed(uuid) from public, anon, authenticated;

revoke all on function public.apply_retention_policy() from public, anon, authenticated;
grant execute on function public.apply_retention_policy() to service_role;

revoke all on function public.get_release_hype_counts() from public, anon, authenticated;
grant execute on function public.get_release_hype_counts() to anon, authenticated;

revoke all on function public.get_my_release_hype_votes() from public, anon, authenticated;
grant execute on function public.get_my_release_hype_votes() to authenticated;

revoke all on function public.public_profile(text) from public, anon, authenticated;
grant execute on function public.public_profile(text) to anon, authenticated;

revoke all on function public.current_user_progress() from public, anon, authenticated;
grant execute on function public.current_user_progress() to authenticated;

revoke all on function public.season_leaderboard(text, integer) from public, anon, authenticated;
grant execute on function public.season_leaderboard(text, integer) to anon, authenticated;

revoke all on function public.set_achievement_showcase(text[]) from public, anon, authenticated;
grant execute on function public.set_achievement_showcase(text[]) to authenticated;

revoke all on function public.admin_progression_overview(text) from public, anon, authenticated;
grant execute on function public.admin_progression_overview(text) to authenticated;

revoke all on function public.admin_adjust_xp(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.admin_adjust_xp(uuid, integer, text) to authenticated;

revoke all on function public.admin_update_xp_rule(text, integer, integer, integer, boolean) from public, anon, authenticated;
grant execute on function public.admin_update_xp_rule(text, integer, integer, integer, boolean) to authenticated;

revoke all on function public.admin_set_season_disqualification(uuid, boolean) from public, anon, authenticated;
grant execute on function public.admin_set_season_disqualification(uuid, boolean) to authenticated;

revoke all on function public.set_profile_cosmetics(text, text, text) from public, anon, authenticated;
grant execute on function public.set_profile_cosmetics(text, text, text) to authenticated;

revoke all on function public.username_available(text) from public, anon, authenticated;
grant execute on function public.username_available(text) to authenticated;

revoke all on function public.report_community_content(text, uuid, text) from public, anon, authenticated;
grant execute on function public.report_community_content(text, uuid, text) to authenticated;

revoke all on function public.admin_resolve_community_report(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_resolve_community_report(uuid, text) to authenticated, service_role;

revoke all on function public.admin_restore_community_user(uuid) from public, anon, authenticated;
grant execute on function public.admin_restore_community_user(uuid) to authenticated, service_role;

revoke all on function public.admin_archive_post(uuid) from public, anon, authenticated;
grant execute on function public.admin_archive_post(uuid) to authenticated;

revoke all on function public.admin_restore_post(uuid) from public, anon, authenticated;
grant execute on function public.admin_restore_post(uuid) to authenticated;

revoke all on function public.admin_moderate_user(uuid, text, text, integer) from public, anon, authenticated;
grant execute on function public.admin_moderate_user(uuid, text, text, integer) to authenticated, service_role;
