-- ============================================================
-- 043: scheduled posts, sponsorship, join requests
--
-- * scheduled_posts: "Authors can manage own" let anyone schedule a post
--   into ANY parish / group / org. deliver-scheduled-posts publishes with
--   the service role (bypassing posts RLS) as an announcement and notifies
--   every follower. Scheduling now requires admin rights on the target.
-- * parish_sponsorship_codes: every signed-in user could read every
--   parish's active code (free premium billed to that parish). Codes are
--   only redeemed server-side (api/claim-sponsorship-code).
-- * sponsored_activations: users could insert activation rows for any
--   parish's code (billing inflation). Only the server writes these.
-- * group_join_requests: could be created already 'approved'.
-- ============================================================

CREATE OR REPLACE FUNCTION can_admin_post_target(p_parish_id uuid, p_group_id uuid, p_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_platform_admin() OR (
        (p_parish_id IS NOT NULL OR p_group_id IS NOT NULL OR p_org_id IS NOT NULL)
    AND (p_parish_id IS NULL OR EXISTS (SELECT 1 FROM parish_admins WHERE parish_id = p_parish_id AND user_id = auth.uid()))
    AND (p_group_id  IS NULL OR is_group_admin(p_group_id))
    AND (p_org_id    IS NULL OR is_org_admin(p_org_id))
  )
$$;
REVOKE EXECUTE ON FUNCTION can_admin_post_target(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION can_admin_post_target(uuid, uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Authors can manage own scheduled posts" ON scheduled_posts;
CREATE POLICY "Authors can manage own scheduled posts" ON scheduled_posts FOR ALL
  USING (auth.uid() = author_id)
  WITH CHECK (
    auth.uid() = author_id
    AND NOT published
    AND can_admin_post_target(parish_id, group_id, org_id)
  );

DROP POLICY IF EXISTS "Authenticated users can read active codes" ON parish_sponsorship_codes;

DROP POLICY IF EXISTS "Authenticated users insert own activation" ON sponsored_activations;

DROP POLICY IF EXISTS "Users can insert own join requests" ON group_join_requests;
CREATE POLICY "Users can insert own join requests" ON group_join_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status = 'pending');
