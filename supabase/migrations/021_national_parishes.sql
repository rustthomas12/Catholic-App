-- Phase 13: National Parish Data
-- Adds provenance tracking, IRS EIN deduplication, and performance indexes
-- for the national parish import from IRS EO BMF data.

-- Track data provenance
ALTER TABLE parishes
  ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'massgis',
  -- 'massgis'  = existing 559 MA parishes from MassGIS (high quality)
  -- 'irs_bmf'  = national import from IRS Exempt Organizations Business Master File
  -- 'manual'   = manually entered by admin
  ADD COLUMN IF NOT EXISTS irs_ein TEXT,
  -- IRS Employer Identification Number — unique per organization
  -- Used as the deduplication key for national imports
  ADD COLUMN IF NOT EXISTS data_quality INTEGER DEFAULT 3;
  -- 1 = address not geocoded (PO box, rural route, etc.)
  -- 2 = geocoded from street address (coordinates estimated)
  -- 3 = high-quality official source (MassGIS standard — existing MA parishes)

-- Unique index on EIN — prevents duplicate imports on re-run
CREATE UNIQUE INDEX IF NOT EXISTS parishes_irs_ein_idx
  ON parishes(irs_ein) WHERE irs_ein IS NOT NULL;

-- State index for the new state filter in DirectoryPage
CREATE INDEX IF NOT EXISTS parishes_state_idx
  ON parishes(state) WHERE state IS NOT NULL;

CREATE INDEX IF NOT EXISTS parishes_data_source_idx
  ON parishes(data_source);

-- Spatial bounding box indexes for the updated useNearbyParishes bounding box query
CREATE INDEX IF NOT EXISTS parishes_latitude_idx
  ON parishes(latitude) WHERE latitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS parishes_longitude_idx
  ON parishes(longitude) WHERE longitude IS NOT NULL;

-- Full-text search index on parish name for server-side ilike searches
CREATE INDEX IF NOT EXISTS parishes_name_lower_idx
  ON parishes(lower(name));

-- Parish edit suggestions — lets users submit corrections for IRS BMF parishes
-- that are missing phone, website, and mass times
CREATE TABLE IF NOT EXISTS parish_edit_suggestions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id      UUID NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
  user_id        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  field_name     TEXT,
  -- Which field: 'phone', 'website', 'mass_times', 'address', 'other'
  suggested_value TEXT NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT now(),
  is_reviewed    BOOLEAN DEFAULT false
);

ALTER TABLE parish_edit_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can submit suggestions"
  ON parish_edit_suggestions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins can read suggestions"
  ON parish_edit_suggestions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can update suggestions"
  ON parish_edit_suggestions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );
