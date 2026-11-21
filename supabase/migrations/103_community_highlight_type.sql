-- 103: notification type for the evening community highlight (spec step 6).
-- Its own migration: a new enum value can't be used in the transaction that adds it.
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'community_highlight';
