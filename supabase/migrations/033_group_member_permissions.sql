-- ============================================================
-- 033: group membership permissions
--
-- INSERT was allowed whenever user_id = auth.uid(), so anyone could add
-- themselves to ANY group — including private ones, skipping approval —
-- and with any role, including 'admin'. There was also no UPDATE policy,
-- so "Make Moderator" silently did nothing.
--
-- Allowed inserts are now exactly the app's three paths:
--   * joining a public group yourself, as a plain member
--   * a group admin adding someone (approving a join request)
--   * a group's creator adding themselves (as admin) when creating it
-- Group admins can change members' roles.
-- ============================================================

DROP POLICY IF EXISTS "Users can join groups" ON group_members;
DROP POLICY IF EXISTS "Members can join or admin can add" ON group_members;

CREATE POLICY "Join public groups, admins add, creators seed" ON group_members FOR INSERT
  WITH CHECK (
    is_group_admin(group_id)
    OR (
      user_id = auth.uid() AND role = 'member'
      AND EXISTS (SELECT 1 FROM groups g WHERE g.id = group_id AND NOT g.is_private)
    )
    OR (
      user_id = auth.uid()
      AND EXISTS (SELECT 1 FROM groups g WHERE g.id = group_id AND g.creator_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Group admins can change roles" ON group_members;
CREATE POLICY "Group admins can change roles" ON group_members FOR UPDATE
  USING (is_group_admin(group_id))
  WITH CHECK (is_group_admin(group_id));
