-- ============================================================
-- 073: notifications disappear with the post they point to
-- Deleting or hiding a post (author delete, moderator "Hide Post",
-- account deletion) left its like / comment / announcement notifications
-- behind; tapping one opened "post not found". 45 such notifications
-- existed when this was written.
-- ============================================================

CREATE OR REPLACE FUNCTION drop_post_notifications()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' OR (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL) THEN
    DELETE FROM notifications
    WHERE reference_id = OLD.id
      AND type IN ('like', 'comment', 'parish_post', 'group_post');
  END IF;
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION drop_post_notifications() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_drop_post_notifications ON posts;
CREATE TRIGGER trg_drop_post_notifications
  AFTER DELETE OR UPDATE OF deleted_at ON posts
  FOR EACH ROW EXECUTE FUNCTION drop_post_notifications();

-- One-time cleanup of notifications that already point at nothing
DELETE FROM notifications n
WHERE n.type IN ('like', 'comment', 'parish_post', 'group_post')
  AND n.reference_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM posts p WHERE p.id = n.reference_id AND p.deleted_at IS NULL);

DELETE FROM notifications n
WHERE n.type = 'post_flagged'
  AND n.reference_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM posts p WHERE p.id = n.reference_id AND p.deleted_at IS NULL)
  AND NOT EXISTS (SELECT 1 FROM content_reports r WHERE r.id = n.reference_id);
