-- ============================================================
-- 061: organization announcements actually reach members
-- Org announcements were saved but never shown on the org page or sent to
-- anyone, and scheduled ones were never published.
-- * notification type org_announcement → every member except the author,
--   honoring the "Parish posts / announcements" preference
-- * a cron job publishes scheduled announcements when due
-- ============================================================

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'org_announcement';
