-- Migration 003: Add onboarding_completed flag to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

COMMENT ON COLUMN profiles.onboarding_completed IS
'Set to true when user completes the 3-step onboarding flow';
