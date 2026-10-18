-- ============================================================
-- 030: publish the tables the app subscribes to in realtime
--
-- Only `notifications` was in the supabase_realtime publication, so the
-- live listeners on direct messages, group chat, comments and prayer
-- requests never fired: an open DM thread or group chat didn't show new
-- messages until reload. Realtime postgres_changes still enforces each
-- table's RLS, so subscribers only receive rows they can already select.
-- ============================================================

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['direct_messages', 'group_chat_messages', 'comments', 'prayer_requests'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
