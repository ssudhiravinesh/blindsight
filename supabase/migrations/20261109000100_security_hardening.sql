-- ============================================
-- Security hardening
-- ============================================

-- 1. Device secrets: devices now authenticate with an id + secret pair.
--    Only the SHA-256 of the secret is stored. Legacy rows without a hash
--    cannot authenticate and the extension transparently re-registers.
ALTER TABLE anon_users ADD COLUMN IF NOT EXISTS secret_hash TEXT
    CHECK (secret_hash IS NULL OR secret_hash ~ '^[0-9a-f]{64}$');

-- 2. Rate limiting (abuse protection for the shared LLM budget).
CREATE TABLE IF NOT EXISTS rate_limits (
    key           TEXT        NOT NULL,
    window_start  TIMESTAMPTZ NOT NULL,
    count         INTEGER     NOT NULL DEFAULT 0,
    PRIMARY KEY (key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);

CREATE OR REPLACE FUNCTION consume_rate_limit(p_key TEXT, p_limit INTEGER, p_window_seconds INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_window TIMESTAMPTZ;
    v_count  INTEGER;
BEGIN
    IF p_limit < 1 OR p_window_seconds < 1 THEN
        RAISE EXCEPTION 'invalid rate limit parameters';
    END IF;

    v_window := to_timestamp(floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds);

    -- Single atomic upsert: concurrent requests cannot both slip under the limit.
    INSERT INTO rate_limits AS rl (key, window_start, count)
    VALUES (p_key, v_window, 1)
    ON CONFLICT (key, window_start) DO UPDATE SET count = rl.count + 1
    RETURNING rl.count INTO v_count;

    RETURN v_count <= p_limit;
END;
$$;

-- 3. Row Level Security on every table. The extension never talks to
--    PostgREST directly; all access goes through edge functions using the
--    service role (which bypasses RLS). Anonymous / authenticated API roles
--    therefore get no policies at all: default deny.
ALTER TABLE tos_cache        ENABLE ROW LEVEL SECURITY;
ALTER TABLE anon_users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracked_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tos_versions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits      ENABLE ROW LEVEL SECURITY;

ALTER TABLE tos_cache        FORCE ROW LEVEL SECURITY;
ALTER TABLE anon_users       FORCE ROW LEVEL SECURITY;
ALTER TABLE tracked_services FORCE ROW LEVEL SECURITY;
ALTER TABLE notifications    FORCE ROW LEVEL SECURITY;
ALTER TABLE scan_log         FORCE ROW LEVEL SECURITY;
ALTER TABLE tos_versions     FORCE ROW LEVEL SECURITY;
ALTER TABLE rate_limits      FORCE ROW LEVEL SECURITY;

-- These policies relied on a client-controllable GUC (app.current_user_id) or
-- exposed the whole analysis cache to the public API.
DROP POLICY IF EXISTS "Public cache read"     ON tos_cache;
DROP POLICY IF EXISTS "Service writes cache"  ON tos_cache;
DROP POLICY IF EXISTS "Own tracked services"  ON tracked_services;
DROP POLICY IF EXISTS "Own notifications"     ON notifications;

-- Views run with the owner's privileges by default and bypass RLS; this one
-- leaked every tracked domain through the public API.
ALTER VIEW monitored_domains SET (security_invoker = true);

REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON monitored_domains FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

-- 4. SECURITY DEFINER functions: pin search_path and restrict execution.
--    increment_cache_hit was callable by anyone via /rest/v1/rpc.
ALTER FUNCTION increment_cache_hit(UUID) SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION increment_cache_hit(UUID)                    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION consume_rate_limit(TEXT, INTEGER, INTEGER)   FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION increment_cache_hit(UUID)                    TO service_role;
GRANT  EXECUTE ON FUNCTION consume_rate_limit(TEXT, INTEGER, INTEGER)   TO service_role;

-- 5. Scheduled jobs.
--    The monitor job previously posted to http://localhost:54321, which only
--    exists in local development, and sent no credentials. It now reads the
--    project URL and a shared cron secret from Supabase Vault:
--      select vault.create_secret('https://<ref>.supabase.co', 'project_url');
--      select vault.create_secret('<random 32+ chars>',      'cron_secret');
--    The same cron secret must be set as the CRON_SECRET function secret.
SELECT cron.unschedule('monitor-tos-changes')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'monitor-tos-changes');

SELECT cron.schedule(
  'monitor-tos-changes',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/monitor-tos-changes',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'cleanup-rate-limits',
  '17 * * * *',
  $$ DELETE FROM rate_limits WHERE window_start < now() - INTERVAL '1 day'; $$
);

SELECT cron.schedule(
  'cleanup-read-notifications',
  '30 4 * * *',
  $$ DELETE FROM notifications WHERE is_read AND created_at < now() - INTERVAL '90 days'; $$
);
