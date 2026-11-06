-- ============================================================
-- 081: deleting an organization
-- There was no way to delete one, not even for a platform admin.
-- Allowed for the organization's admins and platform admins.
-- Refused while it has chapters (delete or detach those first) or a live
-- subscription (Stripe would keep billing with no record left here).
-- Its posts, events, members, invites and announcements go with it
-- (ON DELETE CASCADE); its own groups are deleted too, since they would
-- otherwise be left with no parish or organization. Notifications are
-- cleaned up by the trigger from 078.
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_organization(p_org_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_org_id) THEN
    RAISE EXCEPTION 'Organization not found' USING ERRCODE = 'P0001';
  END IF;
  IF NOT (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin)
    OR EXISTS (SELECT 1 FROM organization_members
               WHERE org_id = p_org_id AND user_id = auth.uid() AND role = 'admin')
  ) THEN
    RAISE EXCEPTION 'Only this organization''s admins can delete it' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM organizations WHERE parent_org_id = p_org_id) THEN
    RAISE EXCEPTION 'This organization still has chapters. Delete them first.' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM org_subscriptions
             WHERE org_id = p_org_id AND status IN ('trialing', 'active', 'past_due')) THEN
    RAISE EXCEPTION 'Cancel this organization''s subscription (Billing) before deleting it.' USING ERRCODE = 'P0001';
  END IF;

  DELETE FROM groups WHERE org_id = p_org_id AND parish_id IS NULL;
  DELETE FROM organizations WHERE id = p_org_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.delete_organization(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.delete_organization(uuid) TO authenticated;
