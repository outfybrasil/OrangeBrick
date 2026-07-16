CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert subscriptions" ON push_subscriptions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can delete subscriptions" ON push_subscriptions
  FOR DELETE USING (true);

CREATE POLICY "Anyone can select own subscription" ON push_subscriptions
  FOR SELECT USING (true);
