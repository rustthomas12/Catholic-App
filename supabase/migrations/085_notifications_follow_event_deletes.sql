-- ============================================================
-- 085: notifications disappear with the event they point to
-- Same idea as 073 (posts) and 078 (groups, organizations). Deleting an
-- event left its "new event" (084) and "event reminder" notifications
-- behind; tapping one opened an event that no longer exists. Deleting a
-- group, organization or parish deletes its events too (cascade), so this
-- covers those.
-- ============================================================

CREATE OR REPLACE FUNCTION drop_event_notifications()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM notifications
  WHERE reference_id = OLD.id
    AND type IN ('new_event', 'event_reminder');
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION drop_event_notifications() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_drop_event_notifications ON events;
CREATE TRIGGER trg_drop_event_notifications
  AFTER DELETE ON events
  FOR EACH ROW EXECUTE FUNCTION drop_event_notifications();

-- One-time cleanup of ones already pointing at nothing
DELETE FROM notifications n
WHERE n.type IN ('new_event', 'event_reminder')
  AND n.reference_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM events e WHERE e.id = n.reference_id);
