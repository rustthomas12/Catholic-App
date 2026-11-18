-- ============================================================
-- 089: Eastern Catholic Churches, phase 1
-- Which of the 24 Catholic churches sui iuris a person belongs to, and
-- which church a parish belongs to. Default 'latin', so existing rows and
-- older app versions are unaffected. For an Eastern parish the existing
-- parishes.diocese column holds its eparchy or exarchate.
-- The list must match src/data/churches.js.
-- APPLY BEFORE deploying the app version that selects parishes.church.
-- ============================================================

ALTER TABLE parishes ADD COLUMN IF NOT EXISTS church text NOT NULL DEFAULT 'latin';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS church text NOT NULL DEFAULT 'latin';

DO $$
DECLARE churches text := $c$('latin',
  'ukrainian','ruthenian','melkite','romanian','slovak','hungarian','italo_albanian',
  'greek','bulgarian','krizevci','macedonian','belarusian','russian','albanian',
  'coptic','ethiopian','eritrean',
  'maronite','syriac','syro_malankara',
  'armenian',
  'chaldean','syro_malabar')$c$;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'parishes_church_check') THEN
    EXECUTE 'ALTER TABLE parishes ADD CONSTRAINT parishes_church_check CHECK (church IN ' || churches || ')';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_church_check') THEN
    EXECUTE 'ALTER TABLE profiles ADD CONSTRAINT profiles_church_check CHECK (church IN ' || churches || ')';
  END IF;
END $$;

-- Directory filter: Eastern parishes are a small share, so a partial index
CREATE INDEX IF NOT EXISTS parishes_church_idx ON parishes (church) WHERE church <> 'latin';

-- profiles has column-level SELECT (054). church stays private like
-- parish_id: your own row comes from get_my_profile(), which returns the
-- whole row, so no grant is needed. parishes has table-level SELECT.
