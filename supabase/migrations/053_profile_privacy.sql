-- ============================================================
-- 053: profile privacy (functions)
--
-- 1. "Members only" visibility now means: bio and home parish are visible
--    only to people who share a parish, group or organization with you
--    (or platform admins). Others get name, username, photo, badges,
--    vocation and join date.
-- 2. Signed-in users could read every column of other users' profiles,
--    including stripe_customer_id, donation totals, subscription and
--    sponsorship fields (issue 67). Table-level SELECT is now limited to
--    public columns; your own full row comes from get_my_profile(), and
--    other people's profiles from get_profile(), which applies (1).
-- ============================================================

CREATE OR REPLACE FUNCTION shares_community(p_a uuid, p_b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    -- same home parish, or one follows the other's home parish, or both follow a parish
    EXISTS (
      SELECT 1 FROM
        (SELECT parish_id FROM profiles WHERE id = p_a AND parish_id IS NOT NULL
         UNION SELECT parish_id FROM parish_follows WHERE user_id = p_a) a
      JOIN
        (SELECT parish_id FROM profiles WHERE id = p_b AND parish_id IS NOT NULL
         UNION SELECT parish_id FROM parish_follows WHERE user_id = p_b) b
      USING (parish_id))
    OR EXISTS (SELECT 1 FROM group_members x JOIN group_members y USING (group_id)
               WHERE x.user_id = p_a AND y.user_id = p_b)
    OR EXISTS (SELECT 1 FROM organization_members x JOIN organization_members y USING (org_id)
               WHERE x.user_id = p_a AND y.user_id = p_b)
$$;
REVOKE EXECUTE ON FUNCTION shares_community(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- The caller's own full profile
CREATE OR REPLACE FUNCTION get_my_profile()
RETURNS profiles LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM profiles WHERE id = auth.uid()
$$;
REVOKE EXECUTE ON FUNCTION get_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_my_profile() TO authenticated;

-- Another user's profile, honoring profile_visibility
CREATE OR REPLACE FUNCTION get_profile(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE p profiles%ROWTYPE; full_access boolean;
BEGIN
  SELECT * INTO p FROM profiles WHERE id = p_id;
  IF NOT FOUND OR auth.uid() IS NULL THEN RETURN NULL; END IF;
  full_access := p.id = auth.uid()
    OR coalesce(p.profile_visibility, 'public') = 'public'
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin)
    OR shares_community(p.id, auth.uid());
  RETURN jsonb_build_object(
    'id', p.id, 'full_name', p.full_name, 'username', p.username, 'avatar_url', p.avatar_url,
    'vocation_state', p.vocation_state, 'is_verified_clergy', p.is_verified_clergy,
    'is_premium', p.is_premium, 'is_patron', p.is_patron, 'is_admin', p.is_admin,
    'created_at', p.created_at, 'deleted_at', p.deleted_at,
    'profile_visibility', p.profile_visibility,
    'limited', NOT full_access,
    'bio',       CASE WHEN full_access THEN p.bio END,
    'parish_id', CASE WHEN full_access THEN p.parish_id END
  );
END $$;
REVOKE EXECUTE ON FUNCTION get_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_profile(uuid) TO authenticated;

-- Admin: pastors awaiting verification (pending_pastor_parish_id is private)
CREATE OR REPLACE FUNCTION admin_pending_pastors()
RETURNS TABLE (id uuid, full_name text, username text, vocation_state text, pending_pastor_parish_id uuid)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND is_admin) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT p.id, p.full_name, p.username, p.vocation_state::text, p.pending_pastor_parish_id
    FROM profiles p WHERE p.pending_pastor_parish_id IS NOT NULL AND p.deleted_at IS NULL;
END $$;
REVOKE EXECUTE ON FUNCTION admin_pending_pastors() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_pending_pastors() TO authenticated;

-- The column restriction itself is migration 054, applied only once the
-- app version that uses these functions is deployed.
