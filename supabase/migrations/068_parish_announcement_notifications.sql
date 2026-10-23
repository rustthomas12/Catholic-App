-- ============================================================
-- 068: notify parish followers of announcements, however they're posted
-- Only the feed composer created these notifications (in the browser).
-- Announcements from the parish dashboard — published now or delivered
-- later by deliver-scheduled-posts — reached nobody: no alert, no push.
-- Same approach as org announcements (062).
-- ============================================================

CREATE OR REPLACE FUNCTION notify_parish_announcement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE parish_name text; headline text;
BEGIN
  IF NOT NEW.is_announcement OR NEW.parish_id IS NULL OR NEW.deleted_at IS NOT NULL THEN
    RETURN NULL;
  END IF;
  SELECT name INTO parish_name FROM parishes WHERE id = NEW.parish_id;
  -- Dashboard announcements are "Title\n\nBody"; lead with the first line
  headline := split_part(NEW.content, E'\n', 1);
  INSERT INTO notifications (user_id, type, reference_id, message, actor_id, is_read)
  SELECT f.user_id, 'parish_post', NEW.id,
         left(coalesce(parish_name, 'Your parish') || ': ' || coalesce(nullif(headline, ''), NEW.content), 300),
         NEW.author_id, false
  FROM parish_follows f
  WHERE f.parish_id = NEW.parish_id AND f.user_id IS DISTINCT FROM NEW.author_id;
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION notify_parish_announcement() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_parish_announcement ON posts;
CREATE TRIGGER trg_notify_parish_announcement AFTER INSERT ON posts
  FOR EACH ROW EXECUTE FUNCTION notify_parish_announcement();
