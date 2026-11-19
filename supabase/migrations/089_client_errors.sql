-- ============================================================
-- 089: client error reports
-- Crashes and unhandled errors in the app are written here so the
-- platform admin can see them (Admin → App errors). No third-party
-- service: the reports stay in this database and are deleted after
-- 30 days.
-- ============================================================

CREATE TABLE IF NOT EXISTS client_errors (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now(),
  user_id     uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  kind        text NOT NULL CHECK (kind IN ('render', 'error', 'rejection')),
  message     text NOT NULL CHECK (char_length(message) <= 500),
  stack       text CHECK (char_length(stack) <= 4000),
  path        text CHECK (char_length(path) <= 300),
  app_version text CHECK (char_length(app_version) <= 40),
  platform    text CHECK (char_length(platform) <= 20),
  user_agent  text CHECK (char_length(user_agent) <= 300)
);

CREATE INDEX IF NOT EXISTS client_errors_created_idx ON client_errors (created_at DESC);

ALTER TABLE client_errors ENABLE ROW LEVEL SECURITY;

-- Anyone may report, signed in or not (sign-in screens crash too), but only
-- as themselves: user_id must be their own id or empty
DROP POLICY IF EXISTS "Anyone can report an error" ON client_errors;
CREATE POLICY "Anyone can report an error" ON client_errors FOR INSERT
  TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Only the platform admin can read them
DROP POLICY IF EXISTS "Platform admins read errors" ON client_errors;
CREATE POLICY "Platform admins read errors" ON client_errors FOR SELECT
  TO authenticated
  USING (is_platform_admin());

GRANT INSERT ON client_errors TO anon, authenticated;
GRANT SELECT ON client_errors TO authenticated;

-- Flood guard: at most 30 reports per user per 10 minutes (signed-out
-- reports share one allowance); extra reports are dropped silently
CREATE OR REPLACE FUNCTION limit_client_errors()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM client_errors
      WHERE created_at > now() - interval '10 minutes'
        AND user_id IS NOT DISTINCT FROM NEW.user_id) >= 30 THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION limit_client_errors() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_limit_client_errors ON client_errors;
CREATE TRIGGER trg_limit_client_errors BEFORE INSERT ON client_errors
  FOR EACH ROW EXECUTE FUNCTION limit_client_errors();

-- Keep 30 days
SELECT cron.unschedule('purge-client-errors')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-client-errors');
SELECT cron.schedule('purge-client-errors', '15 9 * * *',
  $$DELETE FROM client_errors WHERE created_at < now() - interval '30 days'$$);
