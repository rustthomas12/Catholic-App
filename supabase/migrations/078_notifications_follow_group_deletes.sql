-- ============================================================
-- 078: notifications disappear with the group / organization they point to
-- Same idea as 073 (posts). Deleting a group left its join-request,
-- request-response, invite and new-member notifications behind; tapping one
-- opened "group not found". Organizations get the same treatment.
-- ============================================================

CREATE OR REPLACE FUNCTION drop_group_notifications()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM notifications
  WHERE reference_id = OLD.id
    AND type IN ('group_invite', 'group_request', 'group_request_response', 'new_group_member');
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION drop_group_notifications() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_drop_group_notifications ON groups;
CREATE TRIGGER trg_drop_group_notifications
  AFTER DELETE ON groups
  FOR EACH ROW EXECUTE FUNCTION drop_group_notifications();

CREATE OR REPLACE FUNCTION drop_org_notifications()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM notifications
  WHERE reference_id = OLD.id
    AND type IN ('org_announcement', 'new_org_member', 'chapter_request', 'chapter_request_resolved');
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION drop_org_notifications() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_drop_org_notifications ON organizations;
CREATE TRIGGER trg_drop_org_notifications
  AFTER DELETE ON organizations
  FOR EACH ROW EXECUTE FUNCTION drop_org_notifications();

-- One-time cleanup of ones already pointing at nothing
DELETE FROM notifications n
WHERE n.type IN ('group_invite', 'group_request', 'group_request_response', 'new_group_member')
  AND n.reference_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM groups g WHERE g.id = n.reference_id);
