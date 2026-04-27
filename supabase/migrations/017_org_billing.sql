-- ============================================================
-- 017_org_billing.sql
-- Organization subscription tracking (mirrors parish billing)
-- ============================================================

CREATE TABLE IF NOT EXISTS org_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  tier TEXT NOT NULL DEFAULT 'small',
  -- tier values: 'small' ($99/mo), 'mid' ($149/mo), 'large' ($249/mo)
  status TEXT DEFAULT 'trialing',
  -- status values: trialing, active, past_due, canceled, unpaid
  trial_ends_at TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id)
);

CREATE INDEX IF NOT EXISTS org_subscriptions_stripe_customer_idx
  ON org_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS org_subscriptions_org_idx
  ON org_subscriptions(org_id);

-- RLS: org admins can read their own org's subscription
ALTER TABLE org_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins read own subscription"
  ON org_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = org_subscriptions.org_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'admin'
    )
  );
-- No client-side writes — only the Edge Function writes to this table

-- ============================================================
-- Helper function: check if org has active subscription
-- ============================================================

CREATE OR REPLACE FUNCTION org_has_active_subscription(p_org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_subscriptions
    WHERE org_id = p_org_id
    AND status IN ('trialing', 'active')
  );
$$ LANGUAGE sql SECURITY DEFINER;
