-- ============================================================
-- 071: prayer journal is end-to-end encrypted (device-only keys)
-- Entries are encrypted on the member's device (AES-256-GCM, key never
-- leaves the device — src/lib/journalCrypto.js). The table keeps only
-- ciphertext, so nobody with database access — including us — can read a
-- journal. The readable title / content / mood columns are removed so
-- plaintext can't be stored by mistake. (The table was empty when this ran.)
-- Visible to the server: who owns an entry and when it was written/edited.
-- ============================================================

ALTER TABLE prayer_journal
  DROP COLUMN IF EXISTS title,
  DROP COLUMN IF EXISTS content,
  DROP COLUMN IF EXISTS mood,
  ADD COLUMN IF NOT EXISTS ciphertext text NOT NULL,
  ADD COLUMN IF NOT EXISTS iv text NOT NULL,
  ADD COLUMN IF NOT EXISTS key_id uuid NOT NULL;

ALTER TABLE prayer_journal
  ADD CONSTRAINT prayer_journal_ciphertext_b64 CHECK (ciphertext ~ '^[A-Za-z0-9+/]+={0,2}$' AND length(ciphertext) <= 40000),
  ADD CONSTRAINT prayer_journal_iv_b64 CHECK (iv ~ '^[A-Za-z0-9+/]{16}$');
