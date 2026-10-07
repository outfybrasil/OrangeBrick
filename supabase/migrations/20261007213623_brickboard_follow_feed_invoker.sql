create or replace function public.current_user_follow_values()
returns table(follow_type text, follow_value text)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    follows.follow_type,
    case
      when follows.follow_type = 'profile' then coalesce(profile.username, follows.follow_value)
      else follows.follow_value
    end as follow_value
  from public.user_follows follows
  left join public.public_profiles profile
    on profile.user_id = follows.followed_user_id
   and follows.follow_type = 'profile'
  where follows.user_id = (select auth.uid());
$$;

revoke all on function public.current_user_follow_values() from public;
grant execute on function public.current_user_follow_values() to anon, authenticated, service_role;
