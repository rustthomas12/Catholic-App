-- ============================================================
-- 084: tell people about new events
-- Creating an event (organization, group or parish) notified nobody; people
-- only heard about it from a reminder the day before — if they had already
-- RSVP'd, which they couldn't without knowing about it.
-- Now its organization's members, group's members or parish's followers get
-- a "new event" notification (push included) with the date in their own time
-- zone (082). It follows the Event Reminders switch.
-- ============================================================

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'new_event';

CREATE OR REPLACE FUNCTION notify_new_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE place text;
BEGIN
  IF NEW.start_time < now() THEN RETURN NULL; END IF; -- past events: nothing to announce

  place := CASE
    WHEN NEW.org_id IS NOT NULL THEN (SELECT name FROM organizations WHERE id = NEW.org_id)
    WHEN NEW.group_id IS NOT NULL THEN (SELECT name FROM groups WHERE id = NEW.group_id)
    ELSE (SELECT name FROM parishes WHERE id = NEW.parish_id)
  END;

  INSERT INTO notifications (user_id, type, reference_id, message, actor_id, is_read)
  SELECT r.user_id, 'new_event', NEW.id,
         left(coalesce(place, 'New event') || ': ' || NEW.title || ' · ' ||
              to_char(NEW.start_time AT TIME ZONE safe_timezone(coalesce(np.timezone, 'America/New_York')),
                      'Dy, Mon FMDD at FMHH12:MI AM'), 300),
         NEW.creator_id, false
  FROM (
    SELECT m.user_id FROM organization_members m WHERE NEW.org_id IS NOT NULL AND m.org_id = NEW.org_id
    UNION
    SELECT m.user_id FROM group_members m WHERE NEW.group_id IS NOT NULL AND m.group_id = NEW.group_id
    UNION
    SELECT f.user_id FROM parish_follows f
    WHERE NEW.parish_id IS NOT NULL AND NEW.org_id IS NULL AND NEW.group_id IS NULL AND f.parish_id = NEW.parish_id
  ) r
  JOIN profiles p ON p.id = r.user_id AND p.deleted_at IS NULL
  LEFT JOIN notification_preferences np ON np.user_id = r.user_id
  WHERE r.user_id IS DISTINCT FROM NEW.creator_id;

  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION notify_new_event() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_new_event ON events;
CREATE TRIGGER trg_notify_new_event AFTER INSERT ON events
  FOR EACH ROW EXECUTE FUNCTION notify_new_event();

-- New-event notifications follow the "Event reminders" switch
CREATE OR REPLACE FUNCTION public.apply_notification_preferences()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
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
    WHEN 'new_event'                 THEN 'event_reminders'
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
END $function$;
