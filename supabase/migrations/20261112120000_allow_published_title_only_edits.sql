drop trigger if exists enforce_post_publication_quality on public.posts;

create trigger enforce_post_publication_quality
before insert on public.posts
for each row execute function public.enforce_post_publication_quality();

create trigger enforce_post_publication_quality_update
before update of
  is_published,
  title,
  summary,
  image_url,
  image_alt,
  body,
  information_status,
  featured_quote,
  editorial_sources,
  short_article_reason,
  correction_note
on public.posts
for each row
when (not (
  old.is_published is true
  and new.is_published is true
  and char_length(btrim(coalesce(new.title, ''))) between 1 and 70
  and new.summary is not distinct from old.summary
  and new.image_url is not distinct from old.image_url
  and new.image_alt is not distinct from old.image_alt
  and new.body is not distinct from old.body
  and new.information_status is not distinct from old.information_status
  and new.featured_quote is not distinct from old.featured_quote
  and new.editorial_sources is not distinct from old.editorial_sources
  and new.short_article_reason is not distinct from old.short_article_reason
  and new.correction_note is not distinct from old.correction_note
))
execute function public.enforce_post_publication_quality();
