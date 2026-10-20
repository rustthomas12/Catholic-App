-- ============================================================
-- 048: edge functions take pointers, not content
--
-- send-push, distribute-post and send-form-email are deployed without JWT
-- verification and checked nothing, so anyone could POST to them: push any
-- text to any user, broadcast arbitrary "announcements" to a parish's
-- Facebook page / Flocknote / webhooks / follower emails, or spam info@.
--
-- The functions now load the row by id and atomically claim it (recent and
-- not yet handled) before acting, so a forged or replayed call does
-- nothing. The triggers send only { type, id } — which also removes the
-- API key that was hard-coded in these trigger functions.
-- ============================================================

ALTER TABLE notifications       ADD COLUMN IF NOT EXISTS pushed_at      timestamptz;
ALTER TABLE posts               ADD COLUMN IF NOT EXISTS distributed_at timestamptz;
ALTER TABLE contact_submissions ADD COLUMN IF NOT EXISTS emailed_at     timestamptz;
ALTER TABLE parish_applications ADD COLUMN IF NOT EXISTS emailed_at     timestamptz;

-- Existing rows count as handled (they can't be replayed)
UPDATE notifications       SET pushed_at      = created_at WHERE pushed_at IS NULL;
SELECT set_config('infold.trusted_write', 'on', true);
UPDATE posts               SET distributed_at = created_at WHERE distributed_at IS NULL;
SELECT set_config('infold.trusted_write', 'off', true);
UPDATE contact_submissions SET emailed_at     = created_at WHERE emailed_at IS NULL;
UPDATE parish_applications SET emailed_at     = created_at WHERE emailed_at IS NULL;

CREATE OR REPLACE FUNCTION trigger_distribute_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_announcement = true AND NEW.parish_id IS NOT NULL THEN
    PERFORM net.http_post(
      'https://pamggwafyfqxogvqfsox.supabase.co/functions/v1/distribute-post'::text,
      jsonb_build_object('type', 'INSERT', 'record', jsonb_build_object('id', NEW.id)),
      '{}'::jsonb,
      '{"Content-Type": "application/json"}'::jsonb
    );
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION notify_contact_submission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM net.http_post(
    'https://pamggwafyfqxogvqfsox.supabase.co/functions/v1/send-form-email'::text,
    jsonb_build_object('type', 'contact', 'id', NEW.id),
    '{}'::jsonb,
    '{"Content-Type": "application/json"}'::jsonb
  );
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION notify_parish_application()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM net.http_post(
    'https://pamggwafyfqxogvqfsox.supabase.co/functions/v1/send-form-email'::text,
    jsonb_build_object('type', 'parish_application', 'id', NEW.id),
    '{}'::jsonb,
    '{"Content-Type": "application/json"}'::jsonb
  );
  RETURN NEW;
END $$;

REVOKE EXECUTE ON FUNCTION trigger_distribute_post(), notify_contact_submission(), notify_parish_application()
  FROM PUBLIC, anon, authenticated;
