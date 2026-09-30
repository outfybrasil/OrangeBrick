alter table public.posts
  add column if not exists is_featured boolean default false,
  add column if not exists featured_priority integer default 0;

create index if not exists idx_posts_featured on public.posts (is_featured, featured_priority desc, published_at desc) where is_published = true;
