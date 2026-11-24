-- 113: priests and parish admins can block an account from their parish
--
-- Feedback (Fr. Michael): "We need priests and admins to be able to block an
-- account from their parish if they aren't actually a part of the parish."
--
-- A blocked person:
--   - is removed from the parish's followers (and loses it as home parish)
--   - can't follow it again or set it as home parish
--   - can't post, comment or RSVP in that parish
--   - has their existing posts in that parish hidden from everyone
-- They aren't told. Verified parish admins (and platform admins) block and
-- unblock from Parish Admin -> Parishioners. A parish admin can't be blocked.

CREATE TABLE IF NOT EXISTS parish_bans (
  parish_id   uuid NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  banned_by   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (parish_id, user_id)
);
CREATE INDEX IF NOT EXISTS parish_bans_user ON parish_bans (user_id);
ALTER TABLE parish_bans ENABLE ROW LEVEL SECURITY;

-- Only the parish team sees the list; changes go through the functions below
DROP POLICY IF EXISTS parish_bans_team_read ON parish_bans;
CREATE POLICY parish_bans_team_read ON parish_bans FOR SELECT TO authenticated
  USING (is_verified_parish_admin(parish_id) OR is_platform_admin());

CREATE OR REPLACE FUNCTION public.is_banned_from_parish(p_parish_id uuid, p_user_id uuid DEFAULT auth.uid())
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT p_parish_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM parish_bans WHERE parish_id = p_parish_id AND user_id = p_user_id)
$$;

CREATE OR REPLACE FUNCTION public.block_from_parish(p_parish_id uuid, p_user_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT (is_verified_parish_admin(p_parish_id) OR is_platform_admin()) THEN
    RAISE EXCEPTION 'Only parish admins can block people' USING ERRCODE = '42501';
  END IF;
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You can''t block yourself' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM parish_admins WHERE parish_id = p_parish_id AND user_id = p_user_id AND role <> 'pending') THEN
    RAISE EXCEPTION 'Parish admins can''t be blocked' USING ERRCODE = '22023';
  END IF;

  INSERT INTO parish_bans (parish_id, user_id, banned_by) VALUES (p_parish_id, p_user_id, auth.uid())
  ON CONFLICT DO NOTHING;
  DELETE FROM parish_follows WHERE parish_id = p_parish_id AND user_id = p_user_id;
  DELETE FROM parish_moderators WHERE parish_id = p_parish_id AND user_id = p_user_id;
  DELETE FROM parish_admins WHERE parish_id = p_parish_id AND user_id = p_user_id AND role = 'pending';
  UPDATE profiles SET parish_id = NULL WHERE id = p_user_id AND parish_id = p_parish_id;
END $$;

CREATE OR REPLACE FUNCTION public.unblock_from_parish(p_parish_id uuid, p_user_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT (is_verified_parish_admin(p_parish_id) OR is_platform_admin()) THEN
    RAISE EXCEPTION 'Only parish admins can unblock people' USING ERRCODE = '42501';
  END IF;
  DELETE FROM parish_bans WHERE parish_id = p_parish_id AND user_id = p_user_id;
END $$;

REVOKE ALL ON FUNCTION is_banned_from_parish(uuid, uuid), block_from_parish(uuid, uuid), unblock_from_parish(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_banned_from_parish(uuid, uuid), block_from_parish(uuid, uuid), unblock_from_parish(uuid, uuid) TO authenticated;

-- Membership (used by the post policy and elsewhere) ends with a block
CREATE OR REPLACE FUNCTION public.is_parish_member(p_parish_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT is_platform_admin() OR (
    NOT is_banned_from_parish(p_parish_id) AND (
         EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND parish_id = p_parish_id)
      OR EXISTS (SELECT 1 FROM parish_follows WHERE parish_id = p_parish_id AND user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM parish_admins WHERE parish_id = p_parish_id AND user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM parish_moderators WHERE parish_id = p_parish_id AND user_id = auth.uid())))
$$;

-- Can't follow again
DROP POLICY IF EXISTS "Blocked from parish cannot follow" ON parish_follows;
CREATE POLICY "Blocked from parish cannot follow" ON parish_follows AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT is_banned_from_parish(parish_id));

-- Can't comment on that parish's posts
DROP POLICY IF EXISTS "Blocked from parish cannot comment" ON comments;
CREATE POLICY "Blocked from parish cannot comment" ON comments AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT EXISTS (SELECT 1 FROM posts p WHERE p.id = comments.post_id AND is_banned_from_parish(p.parish_id)));

-- Can't RSVP to that parish's events
DROP POLICY IF EXISTS "Blocked from parish cannot rsvp" ON event_rsvps;
CREATE POLICY "Blocked from parish cannot rsvp" ON event_rsvps AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT EXISTS (SELECT 1 FROM events e WHERE e.id = event_rsvps.event_id AND is_banned_from_parish(e.parish_id)));

-- Their posts in that parish are hidden (platform admins still see them)
DROP POLICY IF EXISTS "Hide posts by people blocked from the parish" ON posts;
CREATE POLICY "Hide posts by people blocked from the parish" ON posts AS RESTRICTIVE FOR SELECT TO authenticated
  USING (parish_id IS NULL OR NOT is_banned_from_parish(parish_id, author_id) OR is_platform_admin());

-- Can't set it back as home parish (the change is quietly undone)
CREATE OR REPLACE FUNCTION public.drop_banned_home_parish()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.parish_id IS NOT NULL AND NEW.parish_id IS DISTINCT FROM OLD.parish_id
     AND is_banned_from_parish(NEW.parish_id, NEW.id) THEN
    NEW.parish_id := NULL;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION drop_banned_home_parish() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS profiles_drop_banned_home_parish ON profiles;
CREATE TRIGGER profiles_drop_banned_home_parish BEFORE UPDATE OF parish_id ON profiles
  FOR EACH ROW EXECUTE FUNCTION drop_banned_home_parish();
