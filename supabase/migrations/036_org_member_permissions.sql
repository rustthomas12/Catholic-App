-- ============================================================
-- 036: organization membership + chapter-request notifications
--
-- "Users can join organizations" allowed any insert with user_id =
-- auth.uid(), with ANY role — anyone could make themselves admin of any
-- organization. Self-joins are now plain members only; the org's creator
-- may seed themselves as admin; org admins (via "Org admins can manage
-- members") can still add anyone.
--
-- Chapter requests notified national admins from the client, but
-- non-members can't read a national org's member list, so nobody was
-- told. A trigger now sends it.
-- ============================================================

DROP POLICY IF EXISTS "Users can join organizations" ON organization_members;
CREATE POLICY "Users can join organizations" ON organization_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      role = 'member'
      OR EXISTS (SELECT 1 FROM organizations o WHERE o.id = org_id AND o.created_by = auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION notify_national_admins_of_chapter_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chapter_name text;
  national_name text;
BEGIN
  SELECT name INTO chapter_name FROM organizations WHERE id = NEW.requesting_org_id;
  SELECT name INTO national_name FROM organizations WHERE id = NEW.target_national_org_id;
  INSERT INTO notifications (user_id, type, reference_id, message, actor_id, is_read)
  SELECT m.user_id, 'chapter_request', NEW.target_national_org_id,
         coalesce(chapter_name, 'An organization') || ' is requesting to become a chapter of '
           || coalesce(national_name, 'your organization') || '.',
         NEW.requested_by, false
  FROM organization_members m
  WHERE m.org_id = NEW.target_national_org_id AND m.role = 'admin'
    AND m.user_id <> NEW.requested_by;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_chapter_request ON chapter_requests;
CREATE TRIGGER trg_notify_chapter_request
  AFTER INSERT ON chapter_requests
  FOR EACH ROW EXECUTE FUNCTION notify_national_admins_of_chapter_request();

REVOKE EXECUTE ON FUNCTION notify_national_admins_of_chapter_request() FROM PUBLIC, anon, authenticated;

-- Platform admins manage any organization's members (Admin page →
-- "Assign Org Admin"); is_org_admin() doesn't cover them.
DROP POLICY IF EXISTS "Platform admins manage organization members" ON organization_members;
CREATE POLICY "Platform admins manage organization members" ON organization_members FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin));
