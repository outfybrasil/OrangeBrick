drop policy if exists user_achievements_public_read on public.user_achievements;
create policy user_achievements_public_read on public.user_achievements
  for select to anon, authenticated
  using (true);

alter function public.public_profile(text) security definer;
