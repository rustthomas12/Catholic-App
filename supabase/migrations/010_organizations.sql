-- Migration 010: Organizations (Catholic organizations, ministries, apostolates)
-- Organizations are distinct from parishes — they can span multiple parishes or dioceses.

-- 1. organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name         text NOT NULL,
  slug         text UNIQUE NOT NULL,
  description  text,
  category     text,       -- e.g. 'ministry', 'apostolate', 'charity', 'school', 'other'
  website      text,
  email        text,
  phone        text,
  city         text,
  state        text,
  logo_url     text,
  is_official  boolean NOT NULL DEFAULT false,
  created_by   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 2. organization_members table
CREATE TABLE IF NOT EXISTS organization_members (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role            text NOT NULL DEFAULT 'member', -- 'admin' | 'member'
  joined_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);

-- 3. organization_invites table
CREATE TABLE IF NOT EXISTS organization_invites (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invite_code  text NOT NULL UNIQUE,
  created_by   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  max_uses     integer,                    -- NULL = unlimited
  use_count    integer NOT NULL DEFAULT 0,
  expires_at   timestamptz,               -- NULL = never expires
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX ON organizations (slug);
CREATE INDEX ON organization_members (org_id);
CREATE INDEX ON organization_members (user_id);
CREATE INDEX ON organization_invites (invite_code);

-- Enable RLS
ALTER TABLE organizations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invites   ENABLE ROW LEVEL SECURITY;

-- organizations: readable by all, writable by admins
CREATE POLICY "Anyone can view organizations"
  ON organizations FOR SELECT USING (true);

CREATE POLICY "Org admins can update their org"
  ON organizations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE org_id = organizations.id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);

-- organization_members: members can see members of orgs they belong to; users manage own rows
CREATE POLICY "Members can view fellow members"
  ON organization_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om2
      WHERE om2.org_id = organization_members.org_id
        AND om2.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join organizations"
  ON organization_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave organizations"
  ON organization_members FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Org admins can manage members"
  ON organization_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members adm
      WHERE adm.org_id = organization_members.org_id
        AND adm.user_id = auth.uid()
        AND adm.role = 'admin'
    )
  );

-- organization_invites: org admins manage invites; anyone with the code can read
CREATE POLICY "Org admins can manage invites"
  ON organization_invites FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE org_id = organization_invites.org_id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  );

CREATE POLICY "Anyone can view invite by code (for join flow)"
  ON organization_invites FOR SELECT
  USING (true);
