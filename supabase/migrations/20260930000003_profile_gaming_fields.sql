alter table public.profiles
  add column if not exists playing_now text,
  add column if not exists favorite_games text[] default array[]::text[];
