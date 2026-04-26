-- Migration 014: Billing fields and events log

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS subscription_interval TEXT;

CREATE INDEX IF NOT EXISTS profiles_stripe_customer_id_idx
  ON profiles(stripe_customer_id);

CREATE TABLE IF NOT EXISTS billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  stripe_customer_id TEXT,
  stripe_event_id TEXT UNIQUE,
  event_type TEXT NOT NULL,
  status TEXT,
  interval TEXT,
  amount_cents INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own billing events"
  ON billing_events FOR SELECT
  USING (user_id = auth.uid());
