-- Migration 004: Add profile_visibility to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS profile_visibility text DEFAULT 'public'
CHECK (profile_visibility IN ('public', 'members_only'));

COMMENT ON COLUMN profiles.profile_visibility IS
'Controls who can view this profile: public or members_only';

UPDATE profiles SET profile_visibility = 'public'
WHERE profile_visibility IS NULL;
