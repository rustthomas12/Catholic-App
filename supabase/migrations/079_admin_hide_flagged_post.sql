-- ============================================================
-- 079: "Hide Post" in the admin flag queue never hid anything
-- Only a post's author may update it (RLS), so the platform admin's update
-- matched 0 rows without an error; the app then resolved the flag, which
-- took the report out of the queue while the post stayed up. Other report
-- types already go through admin_remove_reported_content; this is the
-- equivalent for flagged posts.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_hide_flagged_post(p_flag_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_post uuid;
BEGIN
  IF NOT is_platform_admin() THEN RAISE EXCEPTION 'Not allowed'; END IF;

  SELECT post_id INTO v_post FROM post_flags WHERE id = p_flag_id;
  IF v_post IS NULL THEN RAISE EXCEPTION 'Flag not found'; END IF;

  UPDATE posts SET deleted_at = now() WHERE id = v_post AND deleted_at IS NULL;

  -- Every open flag on that post is settled by hiding it
  UPDATE post_flags
  SET is_resolved = true, resolved_by = auth.uid(), resolved_at = now()
  WHERE post_id = v_post AND is_resolved IS NOT TRUE;
END $$;

REVOKE EXECUTE ON FUNCTION public.admin_hide_flagged_post(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_hide_flagged_post(uuid) TO authenticated;
