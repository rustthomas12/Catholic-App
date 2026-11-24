-- 112: parishioners asking for their parish to join inFold
--
-- Onboarding lists every parish. When someone picks one that isn't on
-- inFold (no subscription or trial), the app says we'll reach out to the
-- parish and records an inquiry here. Each new inquiry emails the owner
-- (send-form-email, type 'parish_inquiry') with the parish's contact details
-- and how many people have asked, so the owner can follow up.

CREATE TABLE IF NOT EXISTS parish_inquiries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id   uuid NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  emailed_at  timestamptz,
  UNIQUE (parish_id, user_id)
);
CREATE INDEX IF NOT EXISTS parish_inquiries_parish ON parish_inquiries (parish_id);
ALTER TABLE parish_inquiries ENABLE ROW LEVEL SECURITY;

-- People can record (and see) only their own inquiry, and only for a parish
-- that isn't on inFold
DROP POLICY IF EXISTS parish_inquiries_insert ON parish_inquiries;
CREATE POLICY parish_inquiries_insert ON parish_inquiries FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM parishes p WHERE p.id = parish_id
                AND NOT p.is_b2b_subscriber
                AND coalesce(p.subscription_status, 'inactive') NOT IN ('active', 'trialing'))
  );
DROP POLICY IF EXISTS parish_inquiries_select ON parish_inquiries;
CREATE POLICY parish_inquiries_select ON parish_inquiries FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION notify_parish_inquiry()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM net.http_post(
    'https://pamggwafyfqxogvqfsox.supabase.co/functions/v1/send-form-email'::text,
    jsonb_build_object('type', 'parish_inquiry', 'id', NEW.id),
    '{}'::jsonb,
    '{"Content-Type": "application/json"}'::jsonb
  );
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION notify_parish_inquiry() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS parish_inquiry_email ON parish_inquiries;
CREATE TRIGGER parish_inquiry_email AFTER INSERT ON parish_inquiries
  FOR EACH ROW EXECUTE FUNCTION notify_parish_inquiry();
