create or replace view public.public_profiles
with (security_barrier = true)
as
select
  id,
  user_id,
  nickname,
  username,
  display_name,
  avatar_url,
  banner_url,
  bio,
  is_official,
  favorite_platforms,
  favorite_categories,
  equipped_title,
  equipped_frame,
  profile_theme,
  show_lifetime_xp,
  show_activity_stats,
  show_season_history,
  show_in_leaderboard,
  created_at,
  updated_at
from public.profiles;

revoke all on public.public_profiles from public;
grant select on public.public_profiles to anon, authenticated;

notify pgrst, 'reload schema';
