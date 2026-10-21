-- ============================================================
-- 056: no repeat notifications from toggling
-- Like/unlike/like (or follow/unfollow, join/leave) sent a fresh
-- notification + push every time — an easy way to spam someone's phone.
-- For these "state" types, a repeat from the same actor about the same
-- thing within 24 hours is dropped. Comments, messages, announcements
-- and other content-bearing types are unaffected.
-- ============================================================

CREATE OR REPLACE FUNCTION drop_repeat_notifications()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.type::text IN ('like', 'prayer_response', 'new_parish_member', 'new_group_member',
                        'new_org_member', 'group_request')
     AND NEW.actor_id IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM notifications n
       WHERE n.user_id = NEW.user_id
         AND n.actor_id = NEW.actor_id
         AND n.type = NEW.type
         AND n.reference_id IS NOT DISTINCT FROM NEW.reference_id
         AND n.created_at > now() - interval '24 hours')
  THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_drop_repeat_notifications ON notifications;
CREATE TRIGGER trg_drop_repeat_notifications
  BEFORE INSERT ON notifications
  FOR EACH ROW EXECUTE FUNCTION drop_repeat_notifications();

REVOKE EXECUTE ON FUNCTION drop_repeat_notifications() FROM PUBLIC, anon, authenticated;
