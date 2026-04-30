-- Phase 12: Language preference
-- Add language column to profiles so preference syncs across devices

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';
  -- Supported values: 'en', 'es'
  -- Defaults to 'en' for all existing users

CREATE INDEX IF NOT EXISTS profiles_language_idx ON profiles(language);
