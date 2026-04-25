-- Migration 011: Extend direct_messages with context columns
-- The direct_messages table already exists (created in 001_initial_schema.sql).
-- We add optional foreign keys so a DM can be contextually linked to a parish
-- or organization (e.g., a message TO the parish admin inbox from the directory),
-- and a flag for premium peer-to-peer conversations.

ALTER TABLE direct_messages
  ADD COLUMN IF NOT EXISTS parish_id    uuid REFERENCES parishes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS org_id       uuid REFERENCES organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_premium_dm boolean NOT NULL DEFAULT false;

-- Index new columns for inbox queries
CREATE INDEX IF NOT EXISTS direct_messages_parish_id_idx ON direct_messages (parish_id);
CREATE INDEX IF NOT EXISTS direct_messages_org_id_idx    ON direct_messages (org_id);

-- parish_follows/invites already exist; no new tables needed here.
