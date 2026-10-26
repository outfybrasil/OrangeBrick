alter table public.posts
  add column if not exists title_en text,
  add column if not exists summary_en text,
  add column if not exists body_en jsonb,
  add column if not exists slug_en text unique;

create index if not exists idx_posts_slug_en on public.posts (slug_en) where slug_en is not null;
