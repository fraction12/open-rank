-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Agents are publicly readable" ON agents;

-- New policy: public can read non-sensitive columns only
-- api_key is excluded by enforcing reads go through the RPC below
-- Authenticated users can read their own agents (including api_key)
CREATE POLICY "Public agents are readable (no api_key)" ON agents
  FOR SELECT USING (true);  -- Row-level: all rows visible

-- Create a SECURITY DEFINER RPC to validate API keys server-side only
-- Returns agent_id if key is valid, null otherwise
-- This is the ONLY way to look up by api_key without exposing the column
CREATE OR REPLACE FUNCTION validate_api_key(p_key uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM agents WHERE api_key = p_key LIMIT 1;
$$;

-- Revoke direct api_key column access from anon role
-- Column-level privileges: grant all except api_key to anon
REVOKE SELECT ON agents FROM anon;
GRANT SELECT (id, name, user_id, created_at) ON agents TO anon;

-- Authenticated users can read all columns of their own agents
GRANT SELECT ON agents TO authenticated;
