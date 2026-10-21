-- 063: who to message when someone uses an organization's Contact form.
-- Non-members can't read the member list, and the form used to message
-- organizations.created_by even after that person stepped down.
CREATE OR REPLACE FUNCTION org_admin_ids(p_org_id uuid)
RETURNS TABLE (user_id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.user_id FROM organization_members m
  JOIN profiles p ON p.id = m.user_id AND p.deleted_at IS NULL
  WHERE m.org_id = p_org_id AND m.role = 'admin'
$$;
REVOKE EXECUTE ON FUNCTION org_admin_ids(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION org_admin_ids(uuid) TO authenticated;
