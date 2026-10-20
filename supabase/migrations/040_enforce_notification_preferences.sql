-- ============================================================
-- 040: honor notification preferences
--
-- createNotification() checked the RECIPIENT's notification_preferences
-- from the ACTOR's browser, but that table is readable only by its owner,
-- so the check always saw "no prefs" and notified anyway — turning a type
-- off in Settings did nothing for likes, comments, DMs, etc. DB triggers
-- (follows, parish messages, chapter requests) never checked at all.
--
-- A BEFORE INSERT trigger now drops the notification when the recipient
-- has turned that type off. Mapping mirrors PREFERENCE_MAP in
-- src/lib/notifications.js.
-- ============================================================

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
    WHEN 'prayer_response'           THEN 'prayer_responses'
    WHEN 'confession_reminder'       THEN 'confession_reminder'
    WHEN 'direct_message'            THEN 'direct_messages'
    WHEN 'event_reminder'            THEN 'event_reminders'
    WHEN 'post_flagged'              THEN 'post_flagged'
    WHEN 'new_parish_member'         THEN 'new_parish_member'
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
    RETURN NULL;  -- recipient turned this type off
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_apply_notification_preferences ON notifications;
CREATE TRIGGER trg_apply_notification_preferences
  BEFORE INSERT ON notifications
  FOR EACH ROW EXECUTE FUNCTION apply_notification_preferences();

REVOKE EXECUTE ON FUNCTION apply_notification_preferences() FROM PUBLIC, anon, authenticated;
