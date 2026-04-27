-- Migration 015: Parish subscriptions & sponsorship codes

-- ============================================================
-- Parish subscription tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS parish_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id UUID NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT DEFAULT 'trialing',
  trial_ends_at TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(parish_id)
);

CREATE INDEX IF NOT EXISTS parish_subscriptions_stripe_customer_idx
  ON parish_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS parish_subscriptions_parish_idx
  ON parish_subscriptions(parish_id);

ALTER TABLE parish_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parish admins read own subscription"
  ON parish_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM parish_admins
      WHERE parish_admins.parish_id = parish_subscriptions.parish_id
        AND parish_admins.user_id = auth.uid()
    )
  );

-- ============================================================
-- Parish sponsorship codes
-- ============================================================

CREATE TABLE IF NOT EXISTS parish_sponsorship_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id UUID NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  rotated_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS parish_sponsorship_codes_one_active_idx
  ON parish_sponsorship_codes(parish_id)
  WHERE (is_active = true);

CREATE INDEX IF NOT EXISTS parish_sponsorship_codes_code_idx
  ON parish_sponsorship_codes(code);
CREATE INDEX IF NOT EXISTS parish_sponsorship_codes_parish_idx
  ON parish_sponsorship_codes(parish_id);

ALTER TABLE parish_sponsorship_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read active codes"
  ON parish_sponsorship_codes FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active = true);

CREATE POLICY "Parish admins manage their codes"
  ON parish_sponsorship_codes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM parish_admins
      WHERE parish_admins.parish_id = parish_sponsorship_codes.parish_id
        AND parish_admins.user_id = auth.uid()
    )
  );

-- ============================================================
-- Sponsorship activations
-- ============================================================

CREATE TABLE IF NOT EXISTS sponsored_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parish_id UUID NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
  code_id UUID NOT NULL REFERENCES parish_sponsorship_codes(id) ON DELETE RESTRICT,
  activated_at TIMESTAMPTZ DEFAULT now(),
  returned_at TIMESTAMPTZ,
  is_billable BOOLEAN GENERATED ALWAYS AS (returned_at IS NOT NULL) STORED,
  last_billed_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  deactivated_at TIMESTAMPTZ,
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS sponsored_activations_parish_idx
  ON sponsored_activations(parish_id);
CREATE INDEX IF NOT EXISTS sponsored_activations_billable_idx
  ON sponsored_activations(parish_id, is_billable, is_active);

ALTER TABLE sponsored_activations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own activation"
  ON sponsored_activations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Parish admins read parish activations"
  ON sponsored_activations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM parish_admins
      WHERE parish_admins.parish_id = sponsored_activations.parish_id
        AND parish_admins.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users insert own activation"
  ON sponsored_activations FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- Sponsorship fields on profiles
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS sponsored_by_parish_id UUID REFERENCES parishes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sponsorship_activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS premium_source TEXT DEFAULT 'none';

-- ============================================================
-- Helper function
-- ============================================================

CREATE OR REPLACE FUNCTION parish_has_active_subscription(p_parish_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM parish_subscriptions
    WHERE parish_id = p_parish_id
      AND status IN ('trialing', 'active')
  );
$$ LANGUAGE sql SECURITY DEFINER;
