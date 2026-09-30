alter table public.editorial_images
  add column if not exists content_sha256 text;

alter table public.editorial_images
  add constraint editorial_images_content_sha256_format
  check (content_sha256 is null or content_sha256 ~ '^[a-f0-9]{64}$');

create unique index if not exists editorial_images_content_sha256_unique
  on public.editorial_images (content_sha256)
  where content_sha256 is not null;

create index if not exists editorial_images_source_url_idx
  on public.editorial_images using hash (source_url);

notify pgrst, 'reload schema';
