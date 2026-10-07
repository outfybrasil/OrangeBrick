revoke select on table public.posts from public, anon, authenticated;

grant select (
  id,
  slug,
  title,
  summary,
  body,
  category,
  image_url,
  image_alt,
  author_name,
  author_tag,
  is_published,
  published_at,
  created_at,
  updated_at,
  topic_id,
  information_status,
  featured_quote,
  editorial_sources,
  correction_note,
  is_featured,
  featured_priority
) on table public.posts to anon, authenticated;

grant select on table public.posts to service_role;

notify pgrst, 'reload schema';
