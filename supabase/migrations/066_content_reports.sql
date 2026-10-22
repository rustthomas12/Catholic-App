-- ============================================================
-- 066: report anything users write (App Store 1.2 / Google Play UGC)
-- Posts already had post_flags. This covers comments, direct messages,
-- group chat, prayer requests, profiles and groups. The server fills in
-- what was reported (a snapshot) and who wrote it, so reports can't be
-- forged and admins can review DMs they otherwise can't read.
-- ============================================================

CREATE TABLE IF NOT EXISTS content_reports (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE DEFAULT auth.uid(),
  content_type     text NOT NULL CHECK (content_type IN ('comment','message','group_message','prayer_request','profile','group')),
  content_id       uuid NOT NULL,
  reported_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reason           flag_reason NOT NULL DEFAULT 'other',
  notes            text CHECK (char_length(notes) <= 1000),
  snapshot         text,
  is_resolved      boolean NOT NULL DEFAULT false,
  resolution       text,
  resolved_by      uuid REFERENCES profiles(id),
  resolved_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reporter_id, content_type, content_id)
);
CREATE INDEX IF NOT EXISTS content_reports_open_idx ON content_reports (created_at DESC) WHERE NOT is_resolved;

ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Report as yourself" ON content_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "See your own reports" ON content_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR is_platform_admin());
CREATE POLICY "Admins resolve reports" ON content_reports FOR UPDATE TO authenticated
  USING (is_platform_admin()) WITH CHECK (is_platform_admin());

-- Fill in snapshot + author from the real row; refuse what the reporter can't see
CREATE OR REPLACE FUNCTION prepare_content_report()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE body text; author uuid;
BEGIN
  NEW.reporter_id := auth.uid();
  IF NEW.reporter_id IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;

  CASE NEW.content_type
    WHEN 'comment' THEN
      SELECT c.content, c.author_id INTO body, author FROM comments c WHERE c.id = NEW.content_id;
    WHEN 'message' THEN
      SELECT m.content, m.sender_id INTO body, author FROM direct_messages m
      WHERE m.id = NEW.content_id AND NEW.reporter_id IN (m.sender_id, m.recipient_id);
    WHEN 'group_message' THEN
      SELECT m.content, m.user_id INTO body, author FROM group_chat_messages m
      WHERE m.id = NEW.content_id
        AND EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = m.group_id AND gm.user_id = NEW.reporter_id);
    WHEN 'prayer_request' THEN
      SELECT p.content, p.author_id INTO body, author FROM prayer_requests p WHERE p.id = NEW.content_id;
    WHEN 'profile' THEN
      SELECT coalesce(p.full_name, '') || coalesce(E'\n' || nullif(p.bio, ''), ''), p.id INTO body, author
      FROM profiles p WHERE p.id = NEW.content_id;
    WHEN 'group' THEN
      SELECT g.name || coalesce(E'\n' || nullif(g.description, ''), ''), g.creator_id INTO body, author
      FROM groups g WHERE g.id = NEW.content_id;
  END CASE;

  IF body IS NULL THEN RAISE EXCEPTION 'Content not found' USING ERRCODE = 'P0001'; END IF;
  IF author = NEW.reporter_id THEN RAISE EXCEPTION 'You cannot report your own content' USING ERRCODE = 'P0001'; END IF;

  NEW.snapshot := left(body, 4000);
  NEW.reported_user_id := author;
  NEW.is_resolved := false; NEW.resolution := NULL; NEW.resolved_by := NULL; NEW.resolved_at := NULL;
  NEW.created_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_prepare_content_report ON content_reports;
CREATE TRIGGER trg_prepare_content_report BEFORE INSERT ON content_reports
  FOR EACH ROW EXECUTE FUNCTION prepare_content_report();

-- Tell platform admins (same notification type as post reports)
CREATE OR REPLACE FUNCTION notify_content_report()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO notifications (user_id, type, reference_id, message, actor_id, is_read)
  SELECT p.id, 'post_flagged', NEW.id,
         'New report (' || replace(NEW.content_type, '_', ' ') || '): ' || left(NEW.snapshot, 120),
         NULL, false
  FROM profiles p
  WHERE p.is_admin AND p.deleted_at IS NULL AND p.id <> NEW.reporter_id;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_notify_content_report ON content_reports;
CREATE TRIGGER trg_notify_content_report AFTER INSERT ON content_reports
  FOR EACH ROW EXECUTE FUNCTION notify_content_report();

-- Admin action: take the reported content down and close every open report on it
CREATE OR REPLACE FUNCTION admin_remove_reported_content(p_report_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r content_reports;
BEGIN
  IF NOT is_platform_admin() THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT * INTO r FROM content_reports WHERE id = p_report_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Report not found'; END IF;

  CASE r.content_type
    WHEN 'comment'        THEN UPDATE comments SET is_removed = true WHERE id = r.content_id;
    WHEN 'message'        THEN DELETE FROM direct_messages WHERE id = r.content_id;
    WHEN 'group_message'  THEN UPDATE group_chat_messages SET is_deleted = true WHERE id = r.content_id;
    WHEN 'prayer_request' THEN UPDATE prayer_requests SET deleted_at = now() WHERE id = r.content_id;
    WHEN 'group'          THEN DELETE FROM groups WHERE id = r.content_id;
    ELSE RAISE EXCEPTION 'Profiles cannot be removed; suspend the user instead' USING ERRCODE = 'P0001';
  END CASE;

  UPDATE content_reports SET is_resolved = true, resolution = 'removed', resolved_by = auth.uid(), resolved_at = now()
  WHERE content_type = r.content_type AND content_id = r.content_id AND NOT is_resolved;
END $$;

REVOKE EXECUTE ON FUNCTION prepare_content_report(), notify_content_report() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION admin_remove_reported_content(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_remove_reported_content(uuid) TO authenticated;
