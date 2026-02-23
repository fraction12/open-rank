-- Persistent rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
  key text PRIMARY KEY,
  count integer NOT NULL DEFAULT 1,
  reset_at timestamptz NOT NULL
);

-- Allow anon to read/write rate_limits (needed for API routes using anon key)
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rate limits are managed by server" ON rate_limits FOR ALL USING (true) WITH CHECK (true);

-- Auto-cleanup: delete expired entries (run periodically via index)
CREATE INDEX idx_rate_limits_reset ON rate_limits(reset_at);

-- Atomic rate limit check-and-increment
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key text,
  p_max integer,
  p_window_ms bigint
)
RETURNS jsonb AS $$
DECLARE
  v_now timestamptz := now();
  v_reset timestamptz;
  v_count integer;
  v_allowed boolean;
BEGIN
  -- Delete expired entry for this key
  DELETE FROM rate_limits WHERE key = p_key AND reset_at < v_now;

  -- Try to insert or increment
  INSERT INTO rate_limits (key, count, reset_at)
    VALUES (p_key, 1, v_now + (p_window_ms || ' milliseconds')::interval)
  ON CONFLICT (key) DO UPDATE
    SET count = rate_limits.count + 1
  RETURNING count, reset_at INTO v_count, v_reset;

  v_allowed := v_count <= p_max;
  RETURN jsonb_build_object('allowed', v_allowed, 'count', v_count, 'reset_at', v_reset);
END;
$$ LANGUAGE plpgsql;
