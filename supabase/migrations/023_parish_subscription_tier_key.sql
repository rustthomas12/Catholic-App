-- Migration 023: Add tier_key to parish_subscriptions
-- The parish billing UI references tier_key to show the plan name/price.

ALTER TABLE parish_subscriptions
  ADD COLUMN IF NOT EXISTS tier_key TEXT;
