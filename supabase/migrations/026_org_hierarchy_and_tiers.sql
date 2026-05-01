-- Migration 026: Org hierarchy, chapter system, and tiered pricing
-- Phase 10E

-- ── Parent org hierarchy ──────────────────────────────────────

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS parent_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS org_type TEXT NOT NULL DEFAULT 'standalone';
  -- org_type: 'standalone' | 'national' | 'chapter'

CREATE INDEX IF NOT EXISTS organizations_parent_org_idx
  ON organizations(parent_org_id) WHERE parent_org_id IS NOT NULL;

-- ── Tier tracking fields on org_subscriptions ─────────────────

ALTER TABLE org_subscriptions
  ADD COLUMN IF NOT EXISTS billing_track TEXT DEFAULT 'standalone',
  -- 'standalone' or 'national'
  ADD COLUMN IF NOT EXISTS chapter_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS member_count_at_billing INTEGER DEFAULT 0;

-- ── Chapter requests ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chapter_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requesting_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  target_national_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  message TEXT,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(requesting_org_id, target_national_org_id)
);

CREATE INDEX IF NOT EXISTS chapter_requests_national_idx
  ON chapter_requests(target_national_org_id, status);
CREATE INDEX IF NOT EXISTS chapter_requests_requesting_idx
  ON chapter_requests(requesting_org_id);

ALTER TABLE chapter_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "National org admins manage chapter requests"
  ON chapter_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = chapter_requests.target_national_org_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role = 'admin'
    )
  );

CREATE POLICY "Requesting org admins read own requests"
  ON chapter_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = chapter_requests.requesting_org_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role = 'admin'
    )
  );

CREATE POLICY "Org admins create chapter requests"
  ON chapter_requests FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = chapter_requests.requesting_org_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role = 'admin'
    )
  );

-- ── Tier upgrade notices ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS org_tier_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  notice_type TEXT NOT NULL,
  from_tier TEXT,
  to_tier TEXT,
  grace_period_ends_at TIMESTAMPTZ,
  is_dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE org_tier_notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins read their tier notices"
  ON org_tier_notices FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = org_tier_notices.org_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role = 'admin'
    )
  );

-- ── Helper functions ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_standalone_tier(p_member_count INTEGER)
RETURNS TEXT AS $$
  SELECT CASE
    WHEN p_member_count < 50  THEN 'starter'
    WHEN p_member_count < 100 THEN 'growth'
    WHEN p_member_count < 300 THEN 'established'
    ELSE 'large'
  END;
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_national_tier(p_chapter_count INTEGER)
RETURNS TEXT AS $$
  SELECT CASE
    WHEN p_chapter_count <= 5  THEN 'national_starter'
    WHEN p_chapter_count <= 20 THEN 'national_growth'
    WHEN p_chapter_count <= 50 THEN 'national_established'
    ELSE 'national_network'
  END;
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_child_org_ids(p_parent_id UUID)
RETURNS UUID[] AS $$
  SELECT ARRAY(
    SELECT id FROM organizations WHERE parent_org_id = p_parent_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
