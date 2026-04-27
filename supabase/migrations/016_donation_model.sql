-- ============================================================
-- 016_donation_model.sql
-- Converts individual premium to voluntary donation model.
-- Parish sponsorship (is_premium, premium_source) unchanged.
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS donation_tier TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS donation_tier_since TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS one_time_donation_total_cents INTEGER DEFAULT 0;

-- donation_tier values: null (free), 'supporter' ($5/mo), 'member' ($10/mo),
--                       'patron' ($25/mo), 'benefactor' (one-time)

-- is_premium column is kept — still used for parish-sponsored users only.
-- We no longer set is_premium = true for individual payments.

CREATE INDEX IF NOT EXISTS profiles_donation_tier_idx ON profiles(donation_tier);
