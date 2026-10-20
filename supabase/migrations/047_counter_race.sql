-- ============================================================
-- 047: like/comment counter race
-- The 038 recount triggers ran count(*) under READ COMMITTED: concurrent
-- inserts couldn't see each other's uncommitted rows, so the last writer
-- stored a stale count (stress test: 15 parallel comments -> count 15,
-- actual 17). Lock the post row first; the count statement that follows
-- then sees every committed row, and concurrent writers queue up.
-- FOR NO KEY UPDATE (not FOR UPDATE): inserting a like/comment holds a
-- KEY SHARE lock on the post via the FK, which FOR UPDATE conflicts with
-- -> deadlocks under load (30 parallel comments: 29 failed).
-- ============================================================
CREATE OR REPLACE FUNCTION sync_post_like_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pid uuid := coalesce(NEW.post_id, OLD.post_id);
BEGIN
  PERFORM 1 FROM posts WHERE id = pid FOR NO KEY UPDATE;
  PERFORM set_config('infold.trusted_write', 'on', true);
  UPDATE posts SET like_count = (SELECT count(*) FROM likes WHERE post_id = pid) WHERE id = pid;
  PERFORM set_config('infold.trusted_write', 'off', true);
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION sync_post_comment_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pid uuid := coalesce(NEW.post_id, OLD.post_id);
BEGIN
  PERFORM 1 FROM posts WHERE id = pid FOR NO KEY UPDATE;
  PERFORM set_config('infold.trusted_write', 'on', true);
  UPDATE posts SET comment_count =
    (SELECT count(*) FROM comments WHERE post_id = pid AND NOT coalesce(is_removed, false))
  WHERE id = pid;
  PERFORM set_config('infold.trusted_write', 'off', true);
  RETURN NULL;
END $$;
