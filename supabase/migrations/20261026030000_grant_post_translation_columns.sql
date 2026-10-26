grant select (
  title_en,
  summary_en,
  body_en,
  slug_en
) on table public.posts to anon, authenticated;

notify pgrst, 'reload schema';
