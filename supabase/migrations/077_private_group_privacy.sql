-- ============================================================
-- 077: a private group's members and events are for its members
-- Posts and chat in a private group were already members-only, but any
-- signed-in user could still read:
--   * the full member list (who belongs to, say, a support group), and
--   * the group's events (title, time, location).
-- Admins stay visible to everyone, since someone asking to join is shown
-- who runs the group and their request notifies them. Public groups are
-- unchanged.
-- ============================================================

-- SECURITY DEFINER so the check doesn't re-enter group_members' own policies
CREATE OR REPLACE FUNCTION public.group_is_private(p_group_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_private FROM groups WHERE id = p_group_id), false)
$$;
REVOKE EXECUTE ON FUNCTION public.group_is_private(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.group_is_private(uuid) TO authenticated;

DROP POLICY IF EXISTS "Private group rosters are members-only" ON group_members;
CREATE POLICY "Private group rosters are members-only" ON group_members
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR role = 'admin'
    OR NOT group_is_private(group_id)
    OR is_group_member(group_id)
    OR is_platform_admin()
  );

DROP POLICY IF EXISTS "Private group events are members-only" ON events;
CREATE POLICY "Private group events are members-only" ON events
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    group_id IS NULL
    OR creator_id = auth.uid()
    OR NOT group_is_private(group_id)
    OR is_group_member(group_id)
    OR is_platform_admin()
  );
