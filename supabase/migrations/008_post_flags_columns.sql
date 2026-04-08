-- Migration 008: Add resolution columns to existing post_flags table
-- and add admin RLS policies
-- Run in Supabase SQL Editor

-- Add missing columns to the existing post_flags table
ALTER TABLE post_flags
ADD COLUMN IF NOT EXISTS is_resolved  boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS resolved_by  uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS resolved_at  timestamptz;

CREATE INDEX IF NOT EXISTS post_flags_is_resolved_idx
ON post_flags(is_resolved)
WHERE is_resolved = false;

CREATE INDEX IF NOT EXISTS post_flags_post_id_idx
ON post_flags(post_id);

-- Admin policy: view all flags
CREATE POLICY "Admins can view all flags"
ON post_flags FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Admin policy: update (resolve) flags
CREATE POLICY "Admins can update flags"
ON post_flags FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);
