-- ============================================================
-- Migration: 013_org_posts.sql
-- Add org_id and is_announcement columns to posts table
-- ============================================================

-- Add org_id foreign key to organizations
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- Add is_announcement flag (used for parish and org announcements)
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS is_announcement boolean NOT NULL DEFAULT false;

-- Index for org feed queries
CREATE INDEX IF NOT EXISTS posts_org_id_created_at_idx
  ON posts (org_id, created_at DESC)
  WHERE org_id IS NOT NULL;

-- Index for announcement queries
CREATE INDEX IF NOT EXISTS posts_is_announcement_idx
  ON posts (parish_id, created_at DESC)
  WHERE is_announcement = true;

-- RLS: org members can read org posts
-- (posts table already has RLS enabled from 001_initial_schema.sql)
-- Add a policy for org posts to be readable by org members
CREATE POLICY "Org members can read org posts"
  ON posts FOR SELECT
  USING (
    org_id IS NULL
    OR EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = posts.org_id
        AND organization_members.user_id = auth.uid()
    )
  );

-- Org members can create posts in their org
CREATE POLICY "Org members can insert org posts"
  ON posts FOR INSERT
  WITH CHECK (
    org_id IS NULL
    OR EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = posts.org_id
        AND organization_members.user_id = auth.uid()
    )
  );
