alter default privileges in schema public
revoke execute on functions from public;

do $$
declare
  target_function record;
begin
  for target_function in
    select function_entry.oid::regprocedure as signature, function_entry.prokind
    from pg_catalog.pg_proc as function_entry
    join pg_catalog.pg_namespace as schema_entry on schema_entry.oid = function_entry.pronamespace
    where schema_entry.nspname = 'public'
      and function_entry.prosecdef
      and function_entry.prokind in ('f', 'p')
  loop
    if target_function.prokind = 'p' then
      execute format('revoke execute on procedure %s from public, anon, authenticated', target_function.signature);
      execute format('grant execute on procedure %s to service_role', target_function.signature);
    else
      execute format('revoke execute on function %s from public, anon, authenticated', target_function.signature);
      execute format('grant execute on function %s to service_role', target_function.signature);
    end if;
  end loop;
end;
$$;

grant execute on function public.current_user_is_admin() to authenticated;
grant execute on function public.current_user_follow_values() to authenticated;
grant execute on function public.assert_community_participation_allowed(uuid) to authenticated;
grant execute on function public.community_feed_page(integer, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.community_poll_results(uuid) to anon, authenticated;
grant execute on function public.get_community_comment_like_summaries(uuid[]) to anon, authenticated;
grant execute on function public.article_comment_like_summaries(uuid[]) to anon, authenticated;
grant execute on function public.public_profile_safe(text) to anon, authenticated;
grant execute on function public.get_release_hype_counts() to anon, authenticated;
grant execute on function public.season_leaderboard(text, integer) to anon, authenticated;
grant execute on function public.get_my_release_hype_votes() to authenticated;
grant execute on function public.set_article_comment_like(uuid, boolean) to authenticated;
grant execute on function public.current_user_progress() to authenticated;
grant execute on function public.set_achievement_showcase(text[]) to authenticated;
grant execute on function public.set_profile_cosmetics(text, text, text) to authenticated;
grant execute on function public.username_available(text) to authenticated;
grant execute on function public.report_community_content(text, uuid, text) to authenticated;
grant execute on function public.admin_progression_overview(text) to authenticated;
grant execute on function public.admin_adjust_xp(uuid, integer, text) to authenticated;
grant execute on function public.admin_update_xp_rule(text, integer, integer, integer, boolean) to authenticated;
grant execute on function public.admin_set_season_disqualification(uuid, boolean) to authenticated;
grant execute on function public.admin_resolve_community_report(uuid, text) to authenticated;
grant execute on function public.admin_restore_community_user(uuid) to authenticated;
grant execute on function public.admin_archive_post(uuid) to authenticated;
grant execute on function public.admin_restore_post(uuid) to authenticated;
grant execute on function public.admin_moderate_user(uuid, text, text, integer) to authenticated;
