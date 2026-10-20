-- ============================================================
-- 034: parish-admin notifications + lock down notification inserts
--
-- 1. The app looked up a parish's admins client-side to notify them of a
--    new follower, but RLS only lets users read their OWN parish_admins
--    rows, so the list was always empty and the notice never sent. New
--    parish office messages never notified anyone at all. Both are now
--    sent by SECURITY DEFINER triggers.
-- 2. "Authenticated users can create notifications" let any signed-in user
--    insert any notification for anyone, with any text and any actor —
--    perfect for impersonation/phishing. Only the stricter policy remains:
--    the actor must be the caller.
-- ============================================================

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'parish_message';

CREATE OR REPLACE FUNCTION notify_parish_admins_of_follow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  follower_name text;
BEGIN
  SELECT full_name INTO follower_name FROM profiles WHERE id = NEW.user_id;
  INSERT INTO notifications (user_id, type, reference_id, message, actor_id, is_read)
  SELECT pa.user_id, 'new_parish_member', NEW.parish_id,
         coalesce(follower_name, 'Someone') || ' is now following your parish',
         NEW.user_id, false
  FROM parish_admins pa
  WHERE pa.parish_id = NEW.parish_id AND pa.user_id <> NEW.user_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_parish_follow ON parish_follows;
CREATE TRIGGER trg_notify_parish_follow
  AFTER INSERT ON parish_follows
  FOR EACH ROW EXECUTE FUNCTION notify_parish_admins_of_follow();

CREATE OR REPLACE FUNCTION notify_parish_admins_of_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_name text;
BEGIN
  SELECT full_name INTO sender_name FROM profiles WHERE id = NEW.sender_id;
  INSERT INTO notifications (user_id, type, reference_id, message, actor_id, is_read)
  SELECT pa.user_id, 'parish_message', NEW.parish_id,
         coalesce(sender_name, 'Someone') || ' sent your parish a message'
           || coalesce(': ' || nullif(left(NEW.subject, 60), ''), ''),
         NEW.sender_id, false
  FROM parish_admins pa
  WHERE pa.parish_id = NEW.parish_id AND pa.user_id <> NEW.sender_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_parish_message ON parish_messages;
CREATE TRIGGER trg_notify_parish_message
  AFTER INSERT ON parish_messages
  FOR EACH ROW EXECUTE FUNCTION notify_parish_admins_of_message();

REVOKE EXECUTE ON FUNCTION notify_parish_admins_of_follow() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION notify_parish_admins_of_message() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Authenticated users can create notifications" ON notifications;
