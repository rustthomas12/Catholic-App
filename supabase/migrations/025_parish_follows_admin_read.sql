-- Migration 025: Allow parish admins to read all follower records for their parishes.
-- Without this, the RLS policy "auth.uid() = user_id" meant the admin could only
-- see their own follow row, making the parishioner count always return 0 or 1.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'parish_follows'
      AND policyname = 'Parish admins can read their parish followers'
  ) THEN
    CREATE POLICY "Parish admins can read their parish followers"
      ON parish_follows FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM parish_admins
          WHERE parish_admins.parish_id = parish_follows.parish_id
            AND parish_admins.user_id = auth.uid()
        )
      );
  END IF;
END $$;
