-- ============================================================
-- 070: admins can't suspend themselves or another platform admin
-- set_user_suspended had no target check, so one mis-click on your own
-- row (the Admins filter shows it) suspended the only platform admin.
-- To suspend an admin, remove their admin role first.
-- ============================================================
CREATE OR REPLACE FUNCTION set_user_suspended(target_user_id uuid, suspended boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF suspended AND target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You can''t suspend your own account' USING ERRCODE = 'P0001';
  END IF;
  IF suspended AND EXISTS (SELECT 1 FROM profiles WHERE id = target_user_id AND is_admin) THEN
    RAISE EXCEPTION 'Remove this person''s admin role before suspending them' USING ERRCODE = 'P0001';
  END IF;

  UPDATE profiles
  SET suspended_at = CASE WHEN suspended THEN NOW() ELSE NULL END
  WHERE id = target_user_id;
END;
$$;
