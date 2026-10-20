-- ============================================================
-- 039: comments
--
-- * Deleting your own comment is a soft delete (is_removed = true), but
--   there was no UPDATE policy, so it silently did nothing and the
--   comment came back on reload.
-- * Comments on private-group posts were readable / writable by anyone.
--   A comment is now visible and creatable only where its post is
--   visible (the posts policies are applied inside the EXISTS).
-- ============================================================

DROP POLICY IF EXISTS "Users can remove own comments" ON comments;
CREATE POLICY "Users can remove own comments" ON comments FOR UPDATE
  USING (auth.uid() = author_id OR is_platform_admin())
  WITH CHECK (auth.uid() = author_id OR is_platform_admin());

CREATE OR REPLACE FUNCTION guard_comment_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF is_trusted_writer() THEN RETURN NEW; END IF;
  IF NEW.post_id   IS DISTINCT FROM OLD.post_id
  OR NEW.author_id IS DISTINCT FROM OLD.author_id
  OR (OLD.is_removed AND NOT NEW.is_removed) THEN
    RAISE EXCEPTION 'Not allowed to change this field' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_comment_update ON comments;
CREATE TRIGGER trg_guard_comment_update BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION guard_comment_update();
REVOKE EXECUTE ON FUNCTION guard_comment_update() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Comments follow post visibility" ON comments;
CREATE POLICY "Comments follow post visibility" ON comments AS RESTRICTIVE FOR SELECT
  USING (EXISTS (SELECT 1 FROM posts p WHERE p.id = comments.post_id));

DROP POLICY IF EXISTS "Users can create comments" ON comments;
CREATE POLICY "Users can create comments" ON comments FOR INSERT WITH CHECK (
  auth.uid() = author_id
  AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND suspended_at IS NOT NULL)
  AND EXISTS (SELECT 1 FROM posts p WHERE p.id = comments.post_id)
);
