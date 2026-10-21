-- ============================================================
-- 060: an organization / group always keeps at least one admin
-- The only admin could demote themselves or leave, orphaning the org or
-- group (nobody could manage it — or its paid subscription). Removing or
-- demoting the last admin is now refused with a clear message.
-- Allowed: when the org/group itself is being deleted (cascade), and
-- server-side actions (account deletion, service role).
-- ============================================================

CREATE OR REPLACE FUNCTION keep_last_org_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN coalesce(NEW, OLD); END IF;
  IF OLD.role = 'admin'
     AND (TG_OP = 'DELETE' OR NEW.role IS DISTINCT FROM 'admin')
     AND EXISTS (SELECT 1 FROM organizations WHERE id = OLD.org_id)   -- not a cascade delete
     AND NOT EXISTS (SELECT 1 FROM organization_members
                     WHERE org_id = OLD.org_id AND role = 'admin' AND user_id <> OLD.user_id)
  THEN
    RAISE EXCEPTION 'Make someone else an admin before removing the last admin.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN coalesce(NEW, OLD);
END $$;
DROP TRIGGER IF EXISTS trg_keep_last_org_admin ON organization_members;
CREATE TRIGGER trg_keep_last_org_admin BEFORE UPDATE OR DELETE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION keep_last_org_admin();

CREATE OR REPLACE FUNCTION keep_last_group_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN coalesce(NEW, OLD); END IF;
  IF OLD.role = 'admin'
     AND (TG_OP = 'DELETE' OR NEW.role IS DISTINCT FROM 'admin')
     AND EXISTS (SELECT 1 FROM groups WHERE id = OLD.group_id)
     AND NOT EXISTS (SELECT 1 FROM group_members
                     WHERE group_id = OLD.group_id AND role = 'admin' AND user_id <> OLD.user_id)
  THEN
    RAISE EXCEPTION 'Make someone else an admin before removing the last admin.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN coalesce(NEW, OLD);
END $$;
DROP TRIGGER IF EXISTS trg_keep_last_group_admin ON group_members;
CREATE TRIGGER trg_keep_last_group_admin BEFORE UPDATE OR DELETE ON group_members
  FOR EACH ROW EXECUTE FUNCTION keep_last_group_admin();

REVOKE EXECUTE ON FUNCTION keep_last_org_admin(), keep_last_group_admin() FROM PUBLIC, anon, authenticated;
