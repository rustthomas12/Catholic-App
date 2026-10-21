-- 059: prayer_count never moved for other people's intentions — the
-- counter trigger ran as the praying user, whose UPDATE on someone else's
-- prayer_request is blocked by RLS (0 rows, no error). The Faith page shows
-- this column ("🙏 0"). Run it as definer, lock the row (see 047), recount.
CREATE OR REPLACE FUNCTION update_prayer_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rid uuid := coalesce(NEW.prayer_request_id, OLD.prayer_request_id);
BEGIN
  PERFORM 1 FROM prayer_requests WHERE id = rid FOR NO KEY UPDATE;
  UPDATE prayer_requests SET prayer_count = (SELECT count(*) FROM prayer_responses WHERE prayer_request_id = rid)
  WHERE id = rid;
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION update_prayer_count() FROM PUBLIC, anon, authenticated;

UPDATE prayer_requests r SET prayer_count = (SELECT count(*) FROM prayer_responses x WHERE x.prayer_request_id = r.id);
