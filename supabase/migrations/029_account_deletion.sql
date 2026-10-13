-- ============================================================
-- 029: account deletion that actually deletes
--
-- The Privacy Policy promises: "delete your account in Settings — content
-- is soft-deleted immediately and fully removed after 90 days". Apple
-- (guideline 5.1.1(v)) and Google Play also require real deletion, not
-- just deactivation. Until now /api/delete-account only marked the profile
-- deleted and banned the login; content stayed visible and nothing was
-- ever erased.
--
-- 1. When a profile is marked deleted, hide its content immediately and
--    stop push notifications to its devices.
-- 2. Daily, permanently erase accounts deleted more than 90 days ago.
--    Deleting the auth user cascades to the profile and everything that
--    references it.
--
-- profiles.deleted_at never existed, so the API's soft-delete PATCH was
-- silently rejected: deleted accounts kept a visible profile and their
-- username. The column is added here and past deletions are backfilled.
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- ── 1. Hide content as soon as the account is deleted ──────

CREATE OR REPLACE FUNCTION hide_content_of_deleted_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE posts SET deleted_at = now()
    WHERE author_id = NEW.id AND deleted_at IS NULL;
  UPDATE comments SET is_removed = true
    WHERE author_id = NEW.id AND is_removed = false;
  UPDATE prayer_requests SET deleted_at = now()
    WHERE author_id = NEW.id AND deleted_at IS NULL;
  DELETE FROM push_subscriptions WHERE user_id = NEW.id;
  DELETE FROM native_push_tokens WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hide_content_of_deleted_profile ON profiles;
CREATE TRIGGER trg_hide_content_of_deleted_profile
  AFTER UPDATE OF deleted_at ON profiles
  FOR EACH ROW
  WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
  EXECUTE FUNCTION hide_content_of_deleted_profile();

-- ── 2. Erase accounts 90 days after deletion ───────────────

CREATE OR REPLACE FUNCTION purge_deleted_accounts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ids uuid[];
BEGIN
  SELECT array_agg(id) INTO ids
    FROM profiles
    WHERE deleted_at IS NOT NULL
      AND deleted_at < now() - interval '90 days';

  IF ids IS NULL THEN
    RETURN 0;
  END IF;

  -- post_flags references profiles without ON DELETE, which would block the
  -- cascade: drop the user's own reports and unlink reports they resolved
  DELETE FROM post_flags WHERE user_id = ANY (ids);
  UPDATE post_flags SET resolved_by = NULL WHERE resolved_by = ANY (ids);

  DELETE FROM auth.users WHERE id = ANY (ids);
  RETURN array_length(ids, 1);
END;
$$;

REVOKE ALL ON FUNCTION purge_deleted_accounts() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION hide_content_of_deleted_profile() FROM public, anon, authenticated;

-- Daily at 08:30 UTC
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'purge-deleted-accounts';
SELECT cron.schedule('purge-deleted-accounts', '30 8 * * *', 'SELECT purge_deleted_accounts()');

-- ── Accounts deleted before this migration ─────────────────
-- /api/delete-account replaced their email with deleted-<id>@communio.invalid.
-- Mark them deleted now (the trigger above hides their content); they are
-- erased 90 days from today.
UPDATE profiles p
  SET deleted_at = now(),
      username = 'deleted-' || left(p.id::text, 8)
  FROM auth.users u
  WHERE u.id = p.id
    AND u.email LIKE 'deleted-%@communio.invalid'
    AND p.deleted_at IS NULL;
