-- ============================================================
-- 042: organization invites + org verification badge
--
-- * "Anyone can view invite by code" was USING (true): anyone, even
--   signed out, could list every invite code.
-- * Redeeming bumped use_count from the joiner's browser, which RLS only
--   allows org admins to do, so use_count never moved and max_uses was
--   never enforced; expiry was checked only client-side.
--   Lookup and redemption now go through RPCs that validate server-side.
-- * Org admins could set is_official (verified badge) / org_type /
--   created_by on their own org.
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view invite by code (for join flow)" ON organization_invites;

-- Returns the org for a valid code (or the reason it's not usable)
CREATE OR REPLACE FUNCTION lookup_org_invite(p_code text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE inv organization_invites%ROWTYPE; o organizations%ROWTYPE;
BEGIN
  SELECT * INTO inv FROM organization_invites WHERE invite_code = upper(trim(p_code));
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'not_found'); END IF;
  SELECT * INTO o FROM organizations WHERE id = inv.org_id;
  IF inv.expires_at IS NOT NULL AND inv.expires_at < now() THEN
    RETURN jsonb_build_object('status', 'expired');
  END IF;
  IF inv.max_uses IS NOT NULL AND inv.use_count >= inv.max_uses THEN
    RETURN jsonb_build_object('status', 'used_up');
  END IF;
  RETURN jsonb_build_object('status', 'ok', 'org',
    jsonb_build_object('id', o.id, 'name', o.name, 'logo_url', o.logo_url, 'city', o.city, 'state', o.state));
END $$;

-- Joins the caller to the org and counts the use, atomically
CREATE OR REPLACE FUNCTION redeem_org_invite(p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv organization_invites%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('status', 'signed_out'); END IF;
  SELECT * INTO inv FROM organization_invites WHERE invite_code = upper(trim(p_code)) FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'not_found'); END IF;
  IF EXISTS (SELECT 1 FROM organization_members WHERE org_id = inv.org_id AND user_id = auth.uid()) THEN
    RETURN jsonb_build_object('status', 'already_member', 'org_id', inv.org_id);
  END IF;
  IF inv.expires_at IS NOT NULL AND inv.expires_at < now() THEN
    RETURN jsonb_build_object('status', 'expired');
  END IF;
  IF inv.max_uses IS NOT NULL AND inv.use_count >= inv.max_uses THEN
    RETURN jsonb_build_object('status', 'used_up');
  END IF;
  INSERT INTO organization_members (org_id, user_id, role) VALUES (inv.org_id, auth.uid(), 'member');
  UPDATE organization_invites SET use_count = use_count + 1 WHERE id = inv.id;
  RETURN jsonb_build_object('status', 'joined', 'org_id', inv.org_id);
END $$;

REVOKE EXECUTE ON FUNCTION lookup_org_invite(text), redeem_org_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION lookup_org_invite(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION redeem_org_invite(text) TO authenticated;

-- Org verification fields
CREATE OR REPLACE FUNCTION guard_org_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF is_trusted_writer() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.is_official := false;  -- the badge is granted by platform admins only
    RETURN NEW;
  END IF;
  IF coalesce(current_setting('infold.chapter_approval', true), '') = 'on' THEN RETURN NEW; END IF;
  IF NEW.is_official IS DISTINCT FROM OLD.is_official
  OR NEW.org_type    IS DISTINCT FROM OLD.org_type
  OR NEW.created_by  IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'Not allowed to change verification fields' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_org_update ON organizations;
CREATE TRIGGER trg_guard_org_update BEFORE INSERT OR UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION guard_org_update();
REVOKE EXECUTE ON FUNCTION guard_org_update() FROM PUBLIC, anon, authenticated;

-- Supabase grants new functions to anon by default; redemption needs a session
REVOKE EXECUTE ON FUNCTION redeem_org_invite(text) FROM anon;
