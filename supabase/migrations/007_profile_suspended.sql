-- Migration 007: Add suspended_at to profiles
-- Run in Supabase SQL Editor

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS suspended_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN profiles.suspended_at IS
'Set when account is suspended by a platform admin.
 NULL means active. Suspended users can log in but
 cannot post, comment, or like.';

CREATE INDEX IF NOT EXISTS profiles_suspended_at_idx
ON profiles(suspended_at)
WHERE suspended_at IS NOT NULL;
