-- 110: Photo safety check (Google SafeSearch)
--
-- /api/check-image records a verdict for each uploaded photo here. It runs
-- with the service role; clients can't read or write this table.
--   ok        passed SafeSearch
--   blocked   clearly explicit or graphically violent; the file was deleted
--   unchecked Google couldn't be reached; allowed (members can still report)
--
-- A post may only use a photo from this project's "posts" bucket whose check
-- isn't "blocked", so the check can't be skipped by writing image_url
-- directly. (The posts bucket has no UPDATE policy, so a checked file can't
-- be swapped afterwards.)

CREATE TABLE IF NOT EXISTS public.image_checks (
  bucket     text        NOT NULL,
  path       text        NOT NULL,
  user_id    uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  verdict    text        NOT NULL CHECK (verdict IN ('ok', 'blocked', 'unchecked')),
  scores     jsonb,
  checked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (bucket, path)
);

ALTER TABLE public.image_checks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.image_checks FROM anon, authenticated;
CREATE INDEX IF NOT EXISTS image_checks_user_idx ON public.image_checks (user_id);

CREATE OR REPLACE FUNCTION public.require_checked_post_image()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix constant text := 'https://pamggwafyfqxogvqfsox.supabase.co/storage/v1/object/public/posts/';
  p text;
BEGIN
  IF NEW.image_url IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.image_url IS NOT DISTINCT FROM OLD.image_url THEN RETURN NEW; END IF;

  IF left(NEW.image_url, length(prefix)) <> prefix THEN
    RAISE EXCEPTION 'Photos must be uploaded through inFold.' USING ERRCODE = 'check_violation';
  END IF;

  p := split_part(substr(NEW.image_url, length(prefix) + 1), '?', 1);
  IF NOT EXISTS (
    SELECT 1 FROM image_checks WHERE bucket = 'posts' AND path = p AND verdict <> 'blocked'
  ) THEN
    RAISE EXCEPTION 'This photo didn''t pass the safety check.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.require_checked_post_image() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_require_checked_post_image ON public.posts;
CREATE TRIGGER trg_require_checked_post_image
  BEFORE INSERT OR UPDATE OF image_url ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.require_checked_post_image();
