-- ============================================================
-- 087: members can delete their own prayer requests
-- There was no DELETE policy on prayer_requests, so an intention stayed
-- up forever once posted. Authors may now delete their own. The
-- "someone prayed" responses go with it (ON DELETE CASCADE), and the
-- author's prayer_response notifications are removed like 073/078/085.
-- Reports keep their own snapshot of the text (066), so moderation
-- history is not lost.
-- ============================================================

DROP POLICY IF EXISTS "Authors delete their own prayer requests" ON prayer_requests;
CREATE POLICY "Authors delete their own prayer requests" ON prayer_requests FOR DELETE TO authenticated
  USING (author_id = auth.uid());

CREATE OR REPLACE FUNCTION drop_prayer_request_notifications()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM notifications
  WHERE reference_id = OLD.id
    AND type = 'prayer_response';
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION drop_prayer_request_notifications() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_drop_prayer_request_notifications ON prayer_requests;
CREATE TRIGGER trg_drop_prayer_request_notifications
  AFTER DELETE ON prayer_requests
  FOR EACH ROW EXECUTE FUNCTION drop_prayer_request_notifications();
