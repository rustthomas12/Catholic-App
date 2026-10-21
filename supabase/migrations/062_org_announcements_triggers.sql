-- ============================================================
-- 062: org announcement notifications + scheduled publishing (see 061;
-- the enum value must be committed before it can be used)
-- ============================================================

CREATE OR REPLACE FUNCTION notify_org_announcement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE org_name text;
BEGIN
  IF NOT NEW.published OR (TG_OP = 'UPDATE' AND OLD.published) THEN RETURN NULL; END IF;
  SELECT name INTO org_name FROM organizations WHERE id = NEW.org_id;
  INSERT INTO notifications (user_id, type, reference_id, message, actor_id, is_read)
  SELECT m.user_id, 'org_announcement', NEW.org_id,
         left(coalesce(org_name, 'Your organization') || ': ' ||
              coalesce(nullif(NEW.title, ''), NEW.content), 300),
         NEW.author_id, false
  FROM organization_members m
  WHERE m.org_id = NEW.org_id AND m.user_id IS DISTINCT FROM NEW.author_id;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_notify_org_announcement ON org_announcements;
CREATE TRIGGER trg_notify_org_announcement
  AFTER INSERT OR UPDATE OF published ON org_announcements
  FOR EACH ROW EXECUTE FUNCTION notify_org_announcement();
REVOKE EXECUTE ON FUNCTION notify_org_announcement() FROM PUBLIC, anon, authenticated;

-- Org announcements share the "announcements" preference with parish posts
CREATE OR REPLACE FUNCTION apply_notification_preferences()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  col text;
  prefs jsonb;
BEGIN
  col := CASE NEW.type::text
    WHEN 'like'                      THEN 'likes'
    WHEN 'comment'                   THEN 'comments'
    WHEN 'group_invite'              THEN 'group_invites'
    WHEN 'group_request'             THEN 'group_requests'
    WHEN 'group_request_response'    THEN 'group_requests'
    WHEN 'parish_post'               THEN 'parish_posts'
    WHEN 'org_announcement'          THEN 'parish_posts'
    WHEN 'prayer_response'           THEN 'prayer_responses'
    WHEN 'confession_reminder'       THEN 'confession_reminder'
    WHEN 'direct_message'            THEN 'direct_messages'
    WHEN 'event_reminder'            THEN 'event_reminders'
    WHEN 'post_flagged'              THEN 'post_flagged'
    WHEN 'new_parish_member'         THEN 'new_parish_member'
    WHEN 'parish_message'            THEN 'parish_message'
    WHEN 'group_post'                THEN 'group_posts'
    WHEN 'new_group_member'          THEN 'new_group_member'
    WHEN 'chapter_request'           THEN 'chapter_requests'
    WHEN 'chapter_request_resolved'  THEN 'chapter_requests'
    WHEN 'new_org_member'            THEN 'new_org_member'
    WHEN 'morning_offering_reminder' THEN 'morning_offering_reminder'
    WHEN 'daily_readings_reminder'   THEN 'daily_readings_reminder'
    ELSE NULL
  END;
  IF col IS NULL THEN RETURN NEW; END IF;

  SELECT to_jsonb(np) INTO prefs FROM notification_preferences np WHERE np.user_id = NEW.user_id;
  IF prefs IS NOT NULL AND (prefs ->> col) = 'false' THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END $$;

-- Publish scheduled org announcements when due (fires the trigger above)
CREATE OR REPLACE FUNCTION publish_due_org_announcements()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE org_announcements SET published = true, published_at = now()
  WHERE NOT published AND scheduled_for IS NOT NULL AND scheduled_for <= now()
$$;
REVOKE EXECUTE ON FUNCTION publish_due_org_announcements() FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule('publish-org-announcements')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'publish-org-announcements');
SELECT cron.schedule('publish-org-announcements', '* * * * *', 'SELECT publish_due_org_announcements()');
