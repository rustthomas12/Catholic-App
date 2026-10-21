-- 055: "Delete group" did nothing — groups had no DELETE policy, so the
-- delete matched 0 rows while the app navigated away as if it worked.
-- The creator, the group's admins, or a platform admin may delete it
-- (members, posts, events, chat, requests cascade).
DROP POLICY IF EXISTS "Group admins can delete groups" ON groups;
CREATE POLICY "Group admins can delete groups" ON groups FOR DELETE
  USING (auth.uid() = creator_id OR is_group_admin(id) OR is_platform_admin());
