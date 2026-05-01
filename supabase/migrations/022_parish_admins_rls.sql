-- 022_parish_admins_rls.sql
-- Add missing RLS policies for parish_admins table.
-- RLS was enabled in 001_initial_schema but no policies were ever created,
-- causing all client-side queries to return empty results.

-- Users can read their own parish admin records
-- (needed for Navigation sidebar and ParishPage "Manage Parish" button)
CREATE POLICY "Parish admins can view their own records"
  ON parish_admins FOR SELECT
  USING (auth.uid() = user_id);

-- Parish admins can read all admin records for parishes they admin
-- (needed if/when we show a list of co-admins in ParishAdminPage)
CREATE POLICY "Parish admins can view co-admins for their parishes"
  ON parish_admins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM parish_admins pa2
      WHERE pa2.parish_id = parish_admins.parish_id
        AND pa2.user_id = auth.uid()
    )
  );

-- Platform admins can manage all parish admin records
CREATE POLICY "Platform admins can manage parish_admins"
  ON parish_admins FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
  );
