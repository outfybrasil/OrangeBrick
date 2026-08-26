-- Full-text search indexes for faster search
-- Run this migration in Supabase SQL editor

-- Posts: add search vector column and GIN index
ALTER TABLE posts ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(summary, '')), 'B')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_posts_search ON posts USING GIN (search_vector);

-- Release radar: add search vector column and GIN index
ALTER TABLE release_radar_items ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', coalesce(game, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(release_label, '')), 'B')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_releases_search ON release_radar_items USING GIN (search_vector);

-- Profiles: add search vector column and GIN index
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', coalesce(display_name, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(username, '')), 'B')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_profiles_search ON profiles USING GIN (search_vector);

-- Community posts: add search vector column and GIN index
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', coalesce(content, '')), 'A')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_community_posts_search ON community_posts USING GIN (search_vector);
