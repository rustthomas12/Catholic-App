-- Parish integration connections
-- Each row = one platform connected to one parish
-- TODO: Before production, encrypt access_token/refresh_token using pgcrypto or Supabase Vault
CREATE TABLE IF NOT EXISTS parish_integrations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id        UUID NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
  platform         TEXT NOT NULL,
  -- platform values:
  -- 'facebook'        Facebook Page auto-posting
  -- 'flocknote'       Flocknote email broadcast
  -- 'instagram'       Instagram auto-posting
  -- 'google_business' Google Business post
  -- 'website_webhook' Generic webhook for parish website
  -- 'email_webhook'   Custom email endpoint
  is_enabled       BOOLEAN DEFAULT true,
  access_token     TEXT,
  refresh_token    TEXT,
  token_expires_at TIMESTAMPTZ,
  config           JSONB DEFAULT '{}',
  -- Facebook:         { page_id, page_name, pages (array, if multi-page pending) }
  -- Flocknote:        { api_key, network_id, group_id, network_name }
  -- Website/Email:    { webhook_url, webhook_secret }
  -- Google Business:  { account_id, location_id }
  last_sync_at     TIMESTAMPTZ,
  last_error       TEXT,
  error_count      INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(parish_id, platform)
);

CREATE INDEX IF NOT EXISTS parish_integrations_parish_idx
  ON parish_integrations(parish_id);

ALTER TABLE parish_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parish admins manage integrations"
  ON parish_integrations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM parish_admins
      WHERE parish_admins.parish_id = parish_integrations.parish_id
        AND parish_admins.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM parish_admins
      WHERE parish_admins.parish_id = parish_integrations.parish_id
        AND parish_admins.user_id = auth.uid()
    )
  );

-- Log every distribution attempt for debugging and the activity feed
CREATE TABLE IF NOT EXISTS integration_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id        UUID NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
  integration_id   UUID REFERENCES parish_integrations(id) ON DELETE SET NULL,
  platform         TEXT NOT NULL,
  post_id          UUID,
  status           TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  error_message    TEXT,
  request_payload  JSONB,
  response_body    TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS integration_logs_parish_idx
  ON integration_logs(parish_id, created_at DESC);

ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parish admins read own integration logs"
  ON integration_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM parish_admins
      WHERE parish_admins.parish_id = integration_logs.parish_id
        AND parish_admins.user_id = auth.uid()
    )
  );

CREATE POLICY "Platform admins read all logs"
  ON integration_logs FOR SELECT
  USING (
    (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  );

-- Edge function inserts logs using service role (bypasses RLS)
