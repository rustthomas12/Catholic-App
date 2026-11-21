-- 092: requests from in-app testing (2026-11-19)
--
-- 1. Posts may be up to 5,000 characters (about 850 words) instead of 500,
--    so priests can share a reflection or homily. Comments stay at 500.
--
-- 2. Posts by parish clergy and staff notify the parish's followers, like
--    announcements already do (type 'parish_post', so the existing
--    "Parish posts" setting turns them off). A post counts when it is a plain
--    parish post (not in a group or organization) and the author is a verified
--    priest/deacon or an admin/staff member of that parish. Ordinary members'
--    posts still don't notify anyone.

ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_content_check;
ALTER TABLE posts ADD CONSTRAINT posts_content_check CHECK (char_length(content) <= 5000);

CREATE OR REPLACE FUNCTION notify_parish_announcement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE parish_name text; headline text; author_name text; by_leader boolean;
BEGIN
  IF NEW.parish_id IS NULL OR NEW.deleted_at IS NOT NULL OR coalesce(NEW.is_removed, false) THEN
    RETURN NULL;
  END IF;

  IF NOT NEW.is_announcement THEN
    -- Only plain parish posts by the parish's clergy or staff
    IF NEW.group_id IS NOT NULL OR NEW.org_id IS NOT NULL THEN RETURN NULL; END IF;
    SELECT EXISTS (SELECT 1 FROM profiles WHERE id = NEW.author_id AND is_verified_clergy)
        OR EXISTS (SELECT 1 FROM parish_admins WHERE parish_id = NEW.parish_id AND user_id = NEW.author_id)
      INTO by_leader;
    IF NOT by_leader THEN RETURN NULL; END IF;
  END IF;

  SELECT name INTO parish_name FROM parishes WHERE id = NEW.parish_id;
  -- Dashboard announcements are "Title\n\nBody"; lead with the first line
  headline := split_part(NEW.content, E'\n', 1);

  IF NEW.is_announcement THEN
    INSERT INTO notifications (user_id, type, reference_id, message, actor_id, is_read)
    SELECT f.user_id, 'parish_post', NEW.id,
           left(coalesce(parish_name, 'Your parish') || ': ' || coalesce(nullif(headline, ''), NEW.content), 300),
           NEW.author_id, false
    FROM parish_follows f
    WHERE f.parish_id = NEW.parish_id AND f.user_id IS DISTINCT FROM NEW.author_id;
  ELSE
    SELECT full_name INTO author_name FROM profiles WHERE id = NEW.author_id;
    INSERT INTO notifications (user_id, type, reference_id, message, actor_id, is_read)
    SELECT f.user_id, 'parish_post', NEW.id,
           left(coalesce(author_name, 'Your parish') || ' posted in ' || coalesce(parish_name, 'your parish') || ': '
                || coalesce(nullif(btrim(headline), ''), nullif(btrim(NEW.content), ''), 'a photo'), 300),
           NEW.author_id, false
    FROM parish_follows f
    WHERE f.parish_id = NEW.parish_id AND f.user_id IS DISTINCT FROM NEW.author_id;
  END IF;
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION notify_parish_announcement() FROM PUBLIC, anon, authenticated;
