-- ============================================================
-- 032: who can create / change / delete events
--
-- "Users can create events" only checked creator_id = auth.uid(), so any
-- signed-in user could put an event on ANY parish, group or organization
-- calendar. There was also no DELETE policy, so the parish- and org-admin
-- "delete event" buttons silently did nothing.
--
-- Events now require the creator to administer whatever the event is
-- attached to (or be a platform admin). Creators and those admins can
-- update and delete them.
-- ============================================================

CREATE OR REPLACE FUNCTION can_manage_event_target(p_parish_id uuid, p_group_id uuid, p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin)
    OR (
      (p_parish_id IS NOT NULL OR p_group_id IS NOT NULL OR p_org_id IS NOT NULL)
      AND (p_parish_id IS NULL OR EXISTS (
            SELECT 1 FROM parish_admins WHERE parish_id = p_parish_id AND user_id = auth.uid()))
      AND (p_group_id IS NULL OR EXISTS (
            SELECT 1 FROM group_members WHERE group_id = p_group_id AND user_id = auth.uid() AND role = 'admin'))
      AND (p_org_id IS NULL OR EXISTS (
            SELECT 1 FROM organization_members WHERE org_id = p_org_id AND user_id = auth.uid() AND role = 'admin'))
    );
$$;

REVOKE EXECUTE ON FUNCTION can_manage_event_target(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION can_manage_event_target(uuid, uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Users can create events" ON events;
CREATE POLICY "Admins can create events" ON events FOR INSERT
  WITH CHECK (auth.uid() = creator_id AND can_manage_event_target(parish_id, group_id, org_id));

DROP POLICY IF EXISTS "Event creators can update events" ON events;
CREATE POLICY "Creators and admins can update events" ON events FOR UPDATE
  USING (auth.uid() = creator_id OR can_manage_event_target(parish_id, group_id, org_id))
  WITH CHECK (can_manage_event_target(parish_id, group_id, org_id) OR auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators and admins can delete events" ON events;
CREATE POLICY "Creators and admins can delete events" ON events FOR DELETE
  USING (auth.uid() = creator_id OR can_manage_event_target(parish_id, group_id, org_id));
