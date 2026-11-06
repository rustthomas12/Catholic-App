-- ============================================================
-- 083: parish follower counts for everyone
-- People can only read their own parish_follows rows, so the count on a
-- parish page ("N parishioners here") was 0 or 1 for everyone except the
-- parish's admins. Same fix as org_member_counts (076): the numbers only.
-- ============================================================

CREATE OR REPLACE FUNCTION public.parish_follower_counts(p_parish_ids uuid[])
RETURNS TABLE (parish_id uuid, followers bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT f.parish_id, count(*)
  FROM parish_follows f
  JOIN profiles p ON p.id = f.user_id AND p.deleted_at IS NULL
  WHERE f.parish_id = ANY (p_parish_ids[1:100])
  GROUP BY f.parish_id
$$;

REVOKE EXECUTE ON FUNCTION public.parish_follower_counts(uuid[]) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.parish_follower_counts(uuid[]) TO anon, authenticated;
