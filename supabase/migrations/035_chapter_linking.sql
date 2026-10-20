-- ============================================================
-- 035: chapter linking requires the national org's approval
--
-- * Creating an org could set parent_org_id to ANY national org directly:
--   the client checked the parent's subscription, which non-admins can't
--   read, so it always took the "no approval needed" path. Chapters of a
--   national org get the dashboard free, so this also bypassed billing.
-- * Approval couldn't work: the national admin isn't an admin of the
--   requesting org, so its UPDATE of parent_org_id was blocked by RLS.
--
-- parent_org_id may now only be set or changed by an admin of the parent
-- (or a platform admin / server). Approval goes through
-- approve_chapter_request(), which checks the caller administers the
-- target national org.
-- ============================================================

CREATE OR REPLACE FUNCTION guard_org_parent_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.parent_org_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.parent_org_id IS DISTINCT FROM OLD.parent_org_id)
     AND auth.uid() IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin)
     AND NOT EXISTS (SELECT 1 FROM organization_members
                     WHERE org_id = NEW.parent_org_id AND user_id = auth.uid() AND role = 'admin')
     AND coalesce(current_setting('infold.chapter_approval', true), '') <> 'on'
  THEN
    RAISE EXCEPTION 'Only an admin of the parent organization can link a chapter'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_org_parent_link ON organizations;
CREATE TRIGGER trg_guard_org_parent_link
  BEFORE INSERT OR UPDATE OF parent_org_id ON organizations
  FOR EACH ROW EXECUTE FUNCTION guard_org_parent_link();

CREATE OR REPLACE FUNCTION approve_chapter_request(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req chapter_requests%ROWTYPE;
BEGIN
  SELECT * INTO req FROM chapter_requests WHERE id = p_request_id AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already reviewed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM organization_members
                 WHERE org_id = req.target_national_org_id AND user_id = auth.uid() AND role = 'admin')
     AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE chapter_requests
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = p_request_id;

  PERFORM set_config('infold.chapter_approval', 'on', true);
  UPDATE organizations
  SET parent_org_id = req.target_national_org_id, org_type = 'chapter'
  WHERE id = req.requesting_org_id;
  PERFORM set_config('infold.chapter_approval', 'off', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION approve_chapter_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION approve_chapter_request(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION guard_org_parent_link() FROM PUBLIC, anon, authenticated;
