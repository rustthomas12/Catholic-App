-- ============================================================
-- 038: content + billing integrity (found in a rolled-back exploit pass)
--
-- * posts INSERT: "Users can create posts" (author = me) was OR'ed with
--   the org check, so anyone could post into a private group they are not
--   in, into any org, and publish is_announcement posts in any parish -
--   which fires distribute-post (push to the whole parish).
-- * posts SELECT: private-group posts were readable by every user.
-- * posts UPDATE: authors could un-remove moderated posts, rewrite counts,
--   move a post into another parish/group, or flag it as an announcement.
-- * like_count / comment_count were maintained by the client, which RLS
--   only allows on your own post, so counts drifted. Now kept by triggers.
-- * parishes UPDATE: parish admins could grant themselves an active
--   subscription / official badge / sponsorship (billing bypass).
-- * direct_messages UPDATE: recipients could rewrite received messages.
-- * groups UPDATE: creators could set member_count.
-- * parishes.description: the parish settings form saves it but the
--   column did not exist, so every settings save failed.
-- ============================================================

ALTER TABLE parishes ADD COLUMN IF NOT EXISTS description text;

CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin)
$$;
GRANT EXECUTE ON FUNCTION is_platform_admin() TO authenticated;

-- Trusted callers: server (no JWT), platform admins, or our own counter triggers
CREATE OR REPLACE FUNCTION is_trusted_writer()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NULL
      OR coalesce(current_setting('infold.trusted_write', true), '') = 'on'
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin)
$$;
REVOKE EXECUTE ON FUNCTION is_trusted_writer() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_trusted_writer() TO authenticated;

-- posts: INSERT
DROP POLICY IF EXISTS "Users can create posts" ON posts;
DROP POLICY IF EXISTS "Org members can insert org posts" ON posts;
CREATE POLICY "Users can create posts" ON posts FOR INSERT WITH CHECK (
  auth.uid() = author_id
  AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND suspended_at IS NOT NULL)
  AND (group_id IS NULL OR is_group_member(group_id))
  AND (org_id IS NULL OR is_org_member(org_id))
  AND (
    NOT coalesce(is_announcement, false)
    OR (parish_id IS NOT NULL AND EXISTS (SELECT 1 FROM parish_admins pa
          WHERE pa.parish_id = posts.parish_id AND pa.user_id = auth.uid()))
    OR (org_id IS NOT NULL AND is_org_admin(org_id))
    OR is_platform_admin()
  )
);

-- posts: SELECT (private groups)
DROP POLICY IF EXISTS "Private group posts are members-only" ON posts;
CREATE POLICY "Private group posts are members-only" ON posts AS RESTRICTIVE FOR SELECT USING (
  group_id IS NULL
  OR author_id = auth.uid()
  OR NOT EXISTS (SELECT 1 FROM groups g WHERE g.id = posts.group_id AND g.is_private)
  OR is_group_member(group_id)
  OR is_platform_admin()
);

-- posts: UPDATE guard
CREATE OR REPLACE FUNCTION guard_post_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF is_trusted_writer() THEN RETURN NEW; END IF;
  IF NEW.author_id       IS DISTINCT FROM OLD.author_id
  OR NEW.parish_id       IS DISTINCT FROM OLD.parish_id
  OR NEW.group_id        IS DISTINCT FROM OLD.group_id
  OR NEW.org_id          IS DISTINCT FROM OLD.org_id
  OR NEW.is_announcement IS DISTINCT FROM OLD.is_announcement
  OR NEW.like_count      IS DISTINCT FROM OLD.like_count
  OR NEW.comment_count   IS DISTINCT FROM OLD.comment_count
  OR (OLD.is_removed AND NOT NEW.is_removed)
  THEN
    RAISE EXCEPTION 'Not allowed to change this field' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_post_update ON posts;
CREATE TRIGGER trg_guard_post_update BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION guard_post_update();

-- like / comment counters
CREATE OR REPLACE FUNCTION sync_post_like_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pid uuid := coalesce(NEW.post_id, OLD.post_id);
BEGIN
  PERFORM set_config('infold.trusted_write', 'on', true);
  UPDATE posts SET like_count = (SELECT count(*) FROM likes WHERE post_id = pid) WHERE id = pid;
  PERFORM set_config('infold.trusted_write', 'off', true);
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_sync_post_like_count ON likes;
CREATE TRIGGER trg_sync_post_like_count AFTER INSERT OR DELETE ON likes
  FOR EACH ROW EXECUTE FUNCTION sync_post_like_count();

CREATE OR REPLACE FUNCTION sync_post_comment_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pid uuid := coalesce(NEW.post_id, OLD.post_id);
BEGIN
  PERFORM set_config('infold.trusted_write', 'on', true);
  UPDATE posts SET comment_count =
    (SELECT count(*) FROM comments WHERE post_id = pid AND NOT coalesce(is_removed, false))
  WHERE id = pid;
  PERFORM set_config('infold.trusted_write', 'off', true);
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_sync_post_comment_count ON comments;
CREATE TRIGGER trg_sync_post_comment_count AFTER INSERT OR DELETE OR UPDATE OF is_removed ON comments
  FOR EACH ROW EXECUTE FUNCTION sync_post_comment_count();

REVOKE EXECUTE ON FUNCTION guard_post_update(), sync_post_like_count(), sync_post_comment_count()
  FROM PUBLIC, anon, authenticated;

-- Fix existing drift
SELECT set_config('infold.trusted_write', 'on', true);
UPDATE posts p SET
  like_count    = (SELECT count(*) FROM likes l WHERE l.post_id = p.id),
  comment_count = (SELECT count(*) FROM comments c WHERE c.post_id = p.id AND NOT coalesce(c.is_removed, false));
SELECT set_config('infold.trusted_write', 'off', true);

-- parishes: billing / verification fields
CREATE OR REPLACE FUNCTION guard_parish_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF is_trusted_writer() THEN RETURN NEW; END IF;
  IF NEW.is_official                    IS DISTINCT FROM OLD.is_official
  OR NEW.is_b2b_subscriber              IS DISTINCT FROM OLD.is_b2b_subscriber
  OR NEW.subscription_status            IS DISTINCT FROM OLD.subscription_status
  OR NEW.trial_ends_at                  IS DISTINCT FROM OLD.trial_ends_at
  OR NEW.premium_sponsored              IS DISTINCT FROM OLD.premium_sponsored
  OR NEW.sponsorship_code               IS DISTINCT FROM OLD.sponsorship_code
  OR NEW.sponsorship_code_generated_at  IS DISTINCT FROM OLD.sponsorship_code_generated_at
  OR NEW.data_source                    IS DISTINCT FROM OLD.data_source
  OR NEW.irs_ein                        IS DISTINCT FROM OLD.irs_ein
  OR NEW.data_quality                   IS DISTINCT FROM OLD.data_quality
  OR NEW.parent_parish_id               IS DISTINCT FROM OLD.parent_parish_id
  THEN
    RAISE EXCEPTION 'Not allowed to change billing or verification fields' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_parish_update ON parishes;
CREATE TRIGGER trg_guard_parish_update BEFORE UPDATE ON parishes
  FOR EACH ROW EXECUTE FUNCTION guard_parish_update();

-- direct_messages: recipients may only mark read
CREATE OR REPLACE FUNCTION guard_dm_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF is_trusted_writer() THEN RETURN NEW; END IF;
  IF NEW.sender_id     IS DISTINCT FROM OLD.sender_id
  OR NEW.recipient_id  IS DISTINCT FROM OLD.recipient_id
  OR NEW.content       IS DISTINCT FROM OLD.content
  OR NEW.created_at    IS DISTINCT FROM OLD.created_at
  OR NEW.parish_id     IS DISTINCT FROM OLD.parish_id
  OR NEW.org_id        IS DISTINCT FROM OLD.org_id
  OR NEW.is_premium_dm IS DISTINCT FROM OLD.is_premium_dm
  THEN
    RAISE EXCEPTION 'Messages can only be marked as read' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_dm_update ON direct_messages;
CREATE TRIGGER trg_guard_dm_update BEFORE UPDATE ON direct_messages
  FOR EACH ROW EXECUTE FUNCTION guard_dm_update();

-- groups: member_count is maintained by trigger only
CREATE OR REPLACE FUNCTION guard_group_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF is_trusted_writer() OR pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  IF NEW.member_count IS DISTINCT FROM OLD.member_count
  OR NEW.creator_id   IS DISTINCT FROM OLD.creator_id THEN
    RAISE EXCEPTION 'Not allowed to change this field' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_group_update ON groups;
CREATE TRIGGER trg_guard_group_update BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION guard_group_update();

REVOKE EXECUTE ON FUNCTION guard_parish_update(), guard_dm_update(), guard_group_update()
  FROM PUBLIC, anon, authenticated;
