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

alter table public.profiles enable row level security;

do $$
declare
  item record;
begin
  for item in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
  loop
    execute format('drop policy if exists %I on public.profiles', item.policyname);
  end loop;
end
$$;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (auth.uid() = user_id);

create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (auth.uid() = user_id and not is_official);

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke all on public.profiles from anon, authenticated;
grant select (user_id) on public.profiles to authenticated;
grant insert (user_id, nickname, username, display_name, avatar_url) on public.profiles to authenticated;
grant update (
  nickname,
  username,
  display_name,
  avatar_url,
  banner_url,
  bio,
  favorite_platforms,
  favorite_categories,
  show_lifetime_xp,
  show_activity_stats,
  show_season_history,
  show_in_leaderboard,
  updated_at
) on public.profiles to authenticated;

create or replace function public.public_profile(target_username text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_profile public.profiles%rowtype;
  result jsonb;
begin
  select * into selected_profile
  from public.profiles
  where lower(username) = lower(target_username)
     or lower(display_name) = lower(target_username)
     or lower(nickname) = lower(target_username)
  order by case when lower(username) = lower(target_username) then 0 else 1 end
  limit 1;
  if selected_profile.user_id is null then return null; end if;

  select jsonb_build_object(
    'user_id', selected_profile.user_id,
    'username', selected_profile.username,
    'display_name', selected_profile.display_name,
    'avatar_url', selected_profile.avatar_url,
    'bio', selected_profile.bio,
    'is_official', selected_profile.is_official,
    'created_at', selected_profile.created_at,
    'favorite_platforms', selected_profile.favorite_platforms,
    'favorite_categories', selected_profile.favorite_categories,
    'equipped_title', selected_profile.equipped_title,
    'equipped_frame', selected_profile.equipped_frame,
    'profile_theme', selected_profile.profile_theme,
    'progress', case when selected_profile.is_official then null else jsonb_build_object(
      'lifetime_xp', case when selected_profile.show_lifetime_xp then coalesce(progress.lifetime_xp, 0) else null end,
      'level', coalesce(progress.level, 1),
      'next_level_xp', least(1000000, 100 * power(coalesce(progress.level, 1) + 1, 2)),
      'active_days', coalesce(progress.active_days, 0)
    ) end,
    'season', (
      select jsonb_build_object(
        'id', season.id, 'name', season.name, 'ends_at', season.ends_at,
        'eligible_xp', season_progress.eligible_xp, 'division', season_progress.division,
        'rank', season_progress.rank, 'percentile', season_progress.percentile,
        'is_qualified', season_progress.is_qualified
      )
      from public.seasons season
      left join public.season_progress season_progress
        on season_progress.season_id = season.id and season_progress.user_id = selected_profile.user_id
      where season.status in ('calibration', 'active')
      order by season.starts_at desc limit 1
    ),
    'season_history', case when selected_profile.show_season_history then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', season.id, 'name', season.name, 'ends_at', season.ends_at,
        'eligible_xp', season_progress.eligible_xp, 'division', season_progress.division,
        'rank', season_progress.rank, 'percentile', season_progress.percentile,
        'is_qualified', season_progress.is_qualified
      ) order by season.ends_at desc)
      from (
        select seasons.id, seasons.name, seasons.ends_at, progress.eligible_xp,
          progress.division, progress.rank, progress.percentile, progress.is_qualified
        from public.seasons seasons
        join public.season_progress progress on progress.season_id = seasons.id
        where progress.user_id = selected_profile.user_id and seasons.status = 'completed'
        order by seasons.ends_at desc
        limit 10
      ) season_progress
      join public.seasons season on season.id = season_progress.id
    ), '[]'::jsonb) else '[]'::jsonb end,
    'stats', case when selected_profile.show_activity_stats then jsonb_build_object(
      'posts', (select count(*) from public.community_posts where user_id = selected_profile.user_id),
      'comments', (select count(*) from public.community_comments where user_id = selected_profile.user_id),
      'reactions_received', (select count(*) from public.community_reactions reaction join public.community_posts post on post.id = reaction.post_id where post.user_id = selected_profile.user_id),
      'replies_received', (select count(*) from public.community_comments comment join public.community_posts post on post.id = comment.post_id where post.user_id = selected_profile.user_id),
      'achievements', (select count(*) from public.user_achievements where user_id = selected_profile.user_id and unlocked_at is not null)
    ) else null end,
    'achievements', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'slug', achievement.slug, 'name', achievement.name, 'description', achievement.description,
        'category', achievement.category, 'rarity', achievement.rarity,
        'progress', user_achievement.progress, 'target', user_achievement.target,
        'unlocked_at', user_achievement.unlocked_at, 'is_equipped', user_achievement.is_equipped
      ) order by user_achievement.is_equipped desc, achievement.sort_order), '[]'::jsonb)
      from public.user_achievements user_achievement
      join public.achievements achievement on achievement.id = user_achievement.achievement_id
      where user_achievement.user_id = selected_profile.user_id
        and (user_achievement.unlocked_at is not null or not achievement.is_hidden)
    )
  )
  into result
  from public.user_progress progress
  where progress.user_id = selected_profile.user_id;

  if result is null then
    select jsonb_build_object(
      'user_id', selected_profile.user_id,
      'username', selected_profile.username,
      'display_name', selected_profile.display_name,
      'avatar_url', selected_profile.avatar_url,
      'bio', selected_profile.bio,
      'is_official', selected_profile.is_official,
      'created_at', selected_profile.created_at,
      'favorite_platforms', selected_profile.favorite_platforms,
      'favorite_categories', selected_profile.favorite_categories,
      'progress', null,
      'season', null,
      'season_history', '[]'::jsonb,
      'stats', null,
      'achievements', '[]'::jsonb
    ) into result;
  end if;

  return result;
end;
$$;

notify pgrst, 'reload schema';
