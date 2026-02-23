-- Revert the broken column-level REVOKE/GRANT from M1.
-- PostgREST does NOT support column-level privileges — REVOKE breaks the entire table for anon.
-- The correct approach: keep row-level SELECT open, never SELECT answer_hash in any query.

-- Restore full SELECT grant to anon and authenticated
GRANT SELECT ON puzzles TO anon;
GRANT SELECT ON puzzles TO authenticated;

-- The answer_hash column is protected by simply never selecting it in any API query.
-- No column-level revoke needed — PostgREST enforces access at the row level only.
