-- Migration 007: Add actor_id column to notifications
-- actor_id = the user who triggered the notification (liker, commenter, etc.)
-- Used in NotificationsPage to show actor avatar alongside the message.
-- NULL for system-generated notifications (reminders, etc.)

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS actor_id uuid
    REFERENCES profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN notifications.actor_id IS
  'The user who triggered this notification (e.g. who liked the post). '
  'NULL for system-generated notifications. '
  'Used to show actor avatar in notification list items.';

CREATE INDEX IF NOT EXISTS notifications_actor_id_idx
  ON notifications (actor_id);
