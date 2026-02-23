-- H2 + H5: Protect answer_hash from anon clients
-- Creates a restricted view that excludes answer_hash, grants anon SELECT only on it.

-- 1. Create a public view that excludes sensitive columns
CREATE OR REPLACE VIEW puzzles_public AS
  SELECT
    id, title, description, difficulty, category,
    input_data, release_date, created_at
  FROM puzzles;

-- 2. Grant anon SELECT only on the view
GRANT SELECT ON puzzles_public TO anon;

-- 3. Revoke direct anon SELECT on the base table (table-level, NOT column-level)
-- After this, anon can only read via the view (no answer_hash)
REVOKE SELECT ON puzzles FROM anon;

-- 4. Drop the old permissive SELECT policy (no longer needed since we revoked)
DROP POLICY IF EXISTS "Puzzles are public" ON puzzles;
DROP POLICY IF EXISTS "Public read access" ON puzzles;

-- 5. Add a new policy that only allows authenticated or service role reads on base table
--    (anon goes through view; service role bypasses RLS entirely)
CREATE POLICY "Authenticated or service read"
  ON puzzles FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
