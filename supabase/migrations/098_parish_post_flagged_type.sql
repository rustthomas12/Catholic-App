-- 098: notification type for flags on a parish's posts
--
-- Sent to the parish's moderators (verified admins/staff and appointed
-- moderators, migration 099) and opens the parish moderation queue, unlike
-- post_flagged which opens the platform Admin page. Own migration: Postgres
-- can't use a new enum value in the transaction that adds it.

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'parish_post_flagged';
