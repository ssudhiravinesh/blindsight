-- ============================================
-- CORE TABLES
-- ============================================

-- ToS analysis cache (the cost saver)
CREATE TABLE tos_cache (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tos_hash        TEXT NOT NULL UNIQUE,
    domain          TEXT NOT NULL,
    service_name    TEXT,
    analysis_result JSONB NOT NULL,
    overall_severity INTEGER NOT NULL CHECK (overall_severity BETWEEN 0 AND 3),
    clause_count    INTEGER NOT NULL DEFAULT 0,
    tos_length      INTEGER NOT NULL,
    model_used      TEXT NOT NULL,
    prompt_version  TEXT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now(),
    expires_at      TIMESTAMPTZ DEFAULT now() + INTERVAL '30 days',
    hit_count       INTEGER DEFAULT 0
);

CREATE INDEX idx_tos_cache_hash ON tos_cache(tos_hash);
CREATE INDEX idx_tos_cache_domain ON tos_cache(domain);
CREATE INDEX idx_tos_cache_expires ON tos_cache(expires_at);

-- ============================================
-- USER TABLES (Anonymous-first)
-- ============================================

-- Anonymous users (no PII, UUID-only)
CREATE TABLE anon_users (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id       UUID NOT NULL UNIQUE,
    tier            TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro')),
    scans_today     INTEGER DEFAULT 0,
    last_scan_date  DATE DEFAULT CURRENT_DATE,
    created_at      TIMESTAMPTZ DEFAULT now(),
    last_active_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_anon_users_device ON anon_users(device_id);

-- Optional user accounts (for premium features)
CREATE TABLE user_accounts (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    anon_user_id    UUID REFERENCES anon_users(id) ON DELETE SET NULL,
    email           TEXT UNIQUE,
    auth_provider   TEXT CHECK (auth_provider IN ('google', 'email')),
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- MONITORING TABLES
-- ============================================

-- ToS version history (tracks changes over time)
CREATE TABLE tos_versions (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    domain          TEXT NOT NULL,
    tos_hash        TEXT NOT NULL,
    tos_url         TEXT,
    overall_severity INTEGER CHECK (overall_severity BETWEEN 0 AND 3),
    analysis_result JSONB,
    detected_at     TIMESTAMPTZ DEFAULT now(),
    UNIQUE(domain, tos_hash)
);

CREATE INDEX idx_tos_versions_domain ON tos_versions(domain);
CREATE INDEX idx_tos_versions_detected ON tos_versions(detected_at DESC);

-- User's tracked services
CREATE TABLE tracked_services (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES anon_users(id) ON DELETE CASCADE,
    domain          TEXT NOT NULL,
    tos_url         TEXT,
    last_known_hash TEXT,
    last_severity   INTEGER,
    tracked_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, domain)
);

CREATE INDEX idx_tracked_domain ON tracked_services(domain);

-- Unique tracked domains (materialized for efficient crawling)
CREATE VIEW monitored_domains AS
  SELECT DISTINCT domain, 
         MAX(tos_url) as tos_url,
         COUNT(DISTINCT user_id) as tracker_count
  FROM tracked_services
  GROUP BY domain;

-- Pending notifications for users
CREATE TABLE notifications (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES anon_users(id) ON DELETE CASCADE,
    domain          TEXT NOT NULL,
    service_name    TEXT,
    old_severity    INTEGER,
    new_severity    INTEGER,
    change_summary  TEXT,
    is_read         BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- ============================================
-- ANALYTICS TABLES
-- ============================================

-- Scan log (for rate limiting, analytics, cost tracking)
CREATE TABLE scan_log (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id         UUID REFERENCES anon_users(id),
    tos_hash        TEXT NOT NULL,
    domain          TEXT NOT NULL,
    cache_hit       BOOLEAN NOT NULL,
    severity        INTEGER,
    model_used      TEXT,
    latency_ms      INTEGER,
    scanned_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_scan_log_user ON scan_log(user_id, scanned_at DESC);
CREATE INDEX idx_scan_log_domain ON scan_log(domain);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE tos_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE anon_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracked_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_log ENABLE ROW LEVEL SECURITY;

-- Public cache is readable by everyone
CREATE POLICY "Public cache read" ON tos_cache
    FOR SELECT USING (true);

-- Only Edge Functions (service_role) can write cache
CREATE POLICY "Service writes cache" ON tos_cache
    FOR ALL USING (auth.role() = 'service_role');

-- Users can only see their own data
CREATE POLICY "Own tracked services" ON tracked_services
    FOR ALL USING (user_id = (current_setting('app.current_user_id', true))::uuid);

CREATE POLICY "Own notifications" ON notifications
    FOR ALL USING (user_id = (current_setting('app.current_user_id', true))::uuid);

-- ============================================
-- RPC FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION increment_cache_hit(row_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE tos_cache
    SET hit_count = hit_count + 1
    WHERE id = row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
