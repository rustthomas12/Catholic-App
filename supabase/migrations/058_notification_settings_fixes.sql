-- ============================================================
-- 058: notification settings fixes
-- * "Group Activity" was wired to group_invites (a type nothing sends);
--   group_requests (join requests + approvals) had no switch, so after
--   "Turn off all" it stayed off permanently. The app now drives both
--   together; re-sync existing rows to whatever the switch showed.
-- * Parish admins had no way to turn off "message to your parish"
--   notifications: new parish_message column, honored by the trigger.
-- ============================================================
UPDATE notification_preferences SET group_requests = group_invites
  WHERE group_requests IS DISTINCT FROM group_invites;

ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS parish_message boolean DEFAULT true;
UPDATE notification_preferences SET parish_message = true WHERE parish_message IS NULL;

-- Honor parish_message (same function as 040, plus that type)
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
    RETURN NULL;  -- recipient turned this type off
  END IF;
  RETURN NEW;
END $$;

