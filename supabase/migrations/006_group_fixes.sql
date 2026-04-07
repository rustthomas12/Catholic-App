-- ── 006_group_fixes.sql ───────────────────────────────────────
-- 1. RPC to safely increment group member_count
-- 2. RPC to safely decrement group member_count
-- 3. Trigger to auto-maintain member_count on insert/delete from group_members
-- 4. Fix RLS: allow group admins to remove other members
-- ─────────────────────────────────────────────────────────────

-- 1 & 2. RPCs (kept for explicit calls in useGroupJoin)
CREATE OR REPLACE FUNCTION increment_member_count(group_id_param uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE groups SET member_count = GREATEST(0, member_count + 1)
  WHERE id = group_id_param;
$$;

CREATE OR REPLACE FUNCTION decrement_member_count(group_id_param uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE groups SET member_count = GREATEST(0, member_count - 1)
  WHERE id = group_id_param;
$$;

-- 3. Auto-maintain member_count via trigger (more reliable than RPC calls)
CREATE OR REPLACE FUNCTION trg_group_member_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE groups SET member_count = GREATEST(0, member_count + 1) WHERE id = NEW.group_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE groups SET member_count = GREATEST(0, member_count - 1) WHERE id = OLD.group_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_group_members_count ON group_members;
CREATE TRIGGER trg_group_members_count
  AFTER INSERT OR DELETE ON group_members
  FOR EACH ROW EXECUTE FUNCTION trg_group_member_count();

-- 4. Allow admins to remove other members from their groups
-- Drop existing restrictive delete policy
DROP POLICY IF EXISTS "Users can leave groups" ON group_members;

-- Users can delete their own membership (leave)
CREATE POLICY "Users can leave groups"
  ON group_members FOR DELETE
  USING (auth.uid() = user_id);

-- Group admins can remove any member from groups they admin
CREATE POLICY "Admins can remove group members"
  ON group_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM group_members admin_check
      WHERE admin_check.group_id = group_members.group_id
        AND admin_check.user_id = auth.uid()
        AND admin_check.role = 'admin'
    )
  );
