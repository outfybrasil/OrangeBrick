-- Create post_views table for unique view tracking per device

CREATE TABLE IF NOT EXISTS post_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint: one view per device per post
CREATE UNIQUE INDEX IF NOT EXISTS idx_post_views_unique
  ON post_views (post_id, device_id);

-- Index for counting views per post
CREATE INDEX IF NOT EXISTS idx_post_views_post_id
  ON post_views (post_id);

-- Enable RLS
ALTER TABLE post_views ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (anon)
CREATE POLICY "Anyone can insert views"
  ON post_views FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Anyone can select (for counting)
CREATE POLICY "Anyone can select views"
  ON post_views FOR SELECT
  TO anon, authenticated
  USING (true);
