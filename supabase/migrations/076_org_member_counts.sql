-- ============================================================
-- 076: organization member counts for people who can't see the members
-- Only members can read organization_members (who belongs is private), so a
-- visitor's count query returned 0: an organization page showed "0 members"
-- to everyone deciding whether to join, and a national admin saw 0 for
-- chapters they don't belong to. This returns the numbers only.
-- ============================================================

CREATE OR REPLACE FUNCTION public.org_member_counts(p_org_ids uuid[])
RETURNS TABLE (org_id uuid, members bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.org_id, count(*)
  FROM organization_members m
  WHERE m.org_id = ANY (p_org_ids[1:100])
  GROUP BY m.org_id
$$;

REVOKE EXECUTE ON FUNCTION public.org_member_counts(uuid[]) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.org_member_counts(uuid[]) TO anon, authenticated;
