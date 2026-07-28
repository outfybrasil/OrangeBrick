create or replace function public.set_profile_cosmetics(
  target_title_slug text default null,
  target_frame_slug text default null,
  target_theme_slug text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := auth.uid();
  selected_title text;
  selected_frame text;
  selected_theme text;
begin
  if current_id is null then
    raise exception 'Autenticação necessária';
  end if;

  if target_title_slug is not null then
    select reward.name into selected_title
    from public.user_rewards user_reward
    join public.rewards reward on reward.id = user_reward.reward_id
    where user_reward.user_id = current_id
      and reward.slug = target_title_slug
      and reward.type = 'title'
      and (user_reward.expires_at is null or user_reward.expires_at > now());
    if selected_title is null then raise exception 'Título não desbloqueado'; end if;
  end if;

  if target_frame_slug is not null then
    select reward.slug into selected_frame
    from public.user_rewards user_reward
    join public.rewards reward on reward.id = user_reward.reward_id
    where user_reward.user_id = current_id
      and reward.slug = target_frame_slug
      and reward.type = 'avatar_frame'
      and (user_reward.expires_at is null or user_reward.expires_at > now());
    if selected_frame is null then raise exception 'Moldura não desbloqueada'; end if;
  end if;

  if target_theme_slug is not null and target_theme_slug <> 'default' then
    select reward.slug into selected_theme
    from public.user_rewards user_reward
    join public.rewards reward on reward.id = user_reward.reward_id
    where user_reward.user_id = current_id
      and reward.slug = target_theme_slug
      and reward.type = 'profile_theme'
      and (user_reward.expires_at is null or user_reward.expires_at > now());
    if selected_theme is null then raise exception 'Tema não desbloqueado'; end if;
  else
    selected_theme := 'default';
  end if;

  update public.profiles
  set equipped_title = selected_title,
      equipped_frame = selected_frame,
      profile_theme = selected_theme,
      updated_at = now()
  where user_id = current_id;
end;
$$;

grant execute on function public.set_profile_cosmetics(text, text, text) to authenticated;
