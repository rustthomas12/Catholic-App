-- ============================================================
-- 069: anonymous prayer requests really are anonymous
-- Every signed-in member could read prayer_requests.author_id and embed the
-- author's profile, so "Post anonymously" only hid the name on screen —
-- anyone looking at the network traffic could see who wrote it.
--
-- Members now read through prayer_request_feed, which leaves the author
-- out of anonymous requests (except for the author themselves). The table
-- itself is readable only by each request's author. The "someone prayed
-- for you" notification moves into the database, since the app no longer
-- knows who wrote an anonymous request.
-- ============================================================

CREATE OR REPLACE VIEW prayer_request_feed WITH (security_barrier = true) AS
SELECT
  p.id,
  p.parish_id,
  p.content,
  p.is_anonymous,
  p.prayer_count,
  p.created_at,
  (p.author_id = auth.uid()) AS is_mine,
  CASE WHEN p.is_anonymous AND p.author_id IS DISTINCT FROM auth.uid() THEN NULL ELSE p.author_id END AS author_id,
  CASE WHEN p.is_anonymous AND p.author_id IS DISTINCT FROM auth.uid() THEN NULL ELSE pr.full_name END AS author_name,
  CASE WHEN p.is_anonymous AND p.author_id IS DISTINCT FROM auth.uid() THEN NULL ELSE pr.avatar_url END AS author_avatar_url,
  EXISTS (SELECT 1 FROM prayer_responses r
          WHERE r.prayer_request_id = p.id AND r.user_id = auth.uid()) AS is_prayed_by_me
FROM prayer_requests p
JOIN profiles pr ON pr.id = p.author_id
WHERE auth.uid() IS NOT NULL
  AND p.deleted_at IS NULL
  AND pr.deleted_at IS NULL
  AND NOT is_blocked_by_me(p.author_id);

REVOKE ALL ON prayer_request_feed FROM PUBLIC, anon;
GRANT SELECT ON prayer_request_feed TO authenticated;

-- The table: authors see their own rows; everyone else uses the view
DROP POLICY IF EXISTS "Authenticated users can read prayer requests" ON prayer_requests;
CREATE POLICY "Authors read their own prayer requests" ON prayer_requests FOR SELECT TO authenticated
  USING (author_id = auth.uid());

-- Notify the author when someone prays (works for anonymous requests too)
CREATE OR REPLACE FUNCTION notify_prayer_response()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE author uuid;
BEGIN
  SELECT author_id INTO author FROM prayer_requests WHERE id = NEW.prayer_request_id;
  IF author IS NULL OR author = NEW.user_id THEN RETURN NULL; END IF;
  INSERT INTO notifications (user_id, type, reference_id, message, actor_id, is_read)
  VALUES (author, 'prayer_response', NEW.prayer_request_id, 'Someone prayed for your intention', NEW.user_id, false);
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION notify_prayer_response() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_prayer_response ON prayer_responses;
CREATE TRIGGER trg_notify_prayer_response AFTER INSERT ON prayer_responses
  FOR EACH ROW EXECUTE FUNCTION notify_prayer_response();
