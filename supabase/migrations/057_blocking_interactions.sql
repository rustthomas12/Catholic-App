-- ============================================================
-- 057: blocking stops interactions and notifications
-- After Beta blocked Thomas, Thomas could still comment on (and like)
-- Beta's posts, and Beta was notified with a preview of the comment —
-- even though blocked users' comments are hidden from the blocker.
-- Now: someone you've blocked can't like or comment on your posts, and no
-- notification from a person you've blocked is delivered.
-- ============================================================

DROP POLICY IF EXISTS "Blocked users cannot comment" ON comments;
CREATE POLICY "Blocked users cannot comment" ON comments AS RESTRICTIVE FOR INSERT
  WITH CHECK (NOT EXISTS (SELECT 1 FROM posts p WHERE p.id = comments.post_id AND has_blocked_me(p.author_id)));

DROP POLICY IF EXISTS "Blocked users cannot like" ON likes;
CREATE POLICY "Blocked users cannot like" ON likes AS RESTRICTIVE FOR INSERT
  WITH CHECK (NOT EXISTS (SELECT 1 FROM posts p WHERE p.id = likes.post_id AND has_blocked_me(p.author_id)));

CREATE OR REPLACE FUNCTION drop_notifications_from_blocked()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.actor_id IS NOT NULL AND EXISTS (
       SELECT 1 FROM user_blocks WHERE blocker_id = NEW.user_id AND blocked_id = NEW.actor_id) THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_drop_notifications_from_blocked ON notifications;
CREATE TRIGGER trg_drop_notifications_from_blocked
  BEFORE INSERT ON notifications
  FOR EACH ROW EXECUTE FUNCTION drop_notifications_from_blocked();
REVOKE EXECUTE ON FUNCTION drop_notifications_from_blocked() FROM PUBLIC, anon, authenticated;
