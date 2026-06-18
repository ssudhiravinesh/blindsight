# Blindsight: Definitive Implementation Plan — v3 (Final)

> All decisions locked. All architecture questions resolved. Ready to build.

---

## All Decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | Business model | Free (5 scans/day) → Pro ($5-8/mo) |
| 2 | Stripe | Deferred, not V1 |
| 3 | Backend | Supabase + Edge Functions |
| 4 | Caching | Upstash Redis (hot) + Supabase PostgreSQL (cold) |
| 5 | Auth | Anonymous UUID, optional accounts for premium |
| 6 | Browser target | Chrome first |
| 7 | Enterprise / Community DB | V2 |
| 8 | Fine-tuning | Plan for it, not V1 |
| 9 | License | Proprietary (switch from MIT) |
| 10 | Architecture | Shared-core monorepo, two build targets (Option C) |
| 11 | Offline product pricing | Free (brittle analysis) + one-time purchase for full offline |
| 12 | Offline cache bundle | Yes — downloadable `.json` for paranoid users |
| 13 | Monorepo tooling | Turborepo + pnpm |
| 14 | Private edition timing | Deferred until Cloud V1 is stable |

---

## ToS Change Detection Architecture

### Problem Statement

The public cache stores analysis results keyed by `SHA-256(normalized_tos_text)`. Two staleness scenarios exist:

| Scenario | Is it a real problem? | Why? |
|----------|----------------------|------|
| **User scans a page with updated ToS** | ❌ **Not a problem** | The extension fetches *live* text → new text → new hash → automatic cache miss → fresh analysis |
| **User is *tracking* a service and wants proactive notification** | ✅ **Real problem** | Nobody is visiting the page — the extension needs to be told the ToS changed |

### Why Hash-Based Caching Is Self-Healing

```
Company updates their ToS
        │
        ▼
Next user visits the site
        │
        ▼
Extension extracts LIVE text from the website
        │
        ▼
normalize(live_text) → SHA-256 → new_hash
        │
        ▼
Cache lookup: WHERE tos_hash = new_hash
        │
        ├── old_hash ≠ new_hash → CACHE MISS (automatic!)
        │         │
        │         ▼
        │   LLM analysis on new text
        │         │
        │         ▼
        │   New cache entry created with new_hash
        │   Old entry sits untouched (orphaned, eventually TTL-expired)
        │
        └── This is why scan-time staleness is impossible.
```

The hash *is* the freshness check. No separate "is this stale?" mechanism needed.

### Text Normalization Pipeline

The hash must be resistant to cosmetic changes (dates, formatting) while sensitive to substantive changes (new clauses, removed rights). Here's the pipeline:

```typescript
function normalizeToS(rawText: string): string {
  return rawText
    // 1. Strip HTML tags
    .replace(/<[^>]*>/g, ' ')
    // 2. Decode common HTML entities
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    // 3. Remove "Last updated" / "Effective date" lines
    .replace(/(?:last\s+(?:updated|modified|revised)|effective\s+(?:date|as\s+of))[\s:]*\S+[\s,]*\d{0,4}/gi, '')
    // 4. Remove standalone dates (e.g., "January 15, 2026", "2026-01-15")
    .replace(/\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s*\d{4}/gi, '')
    .replace(/\b\d{4}[-/]\d{2}[-/]\d{2}\b/g, '')
    // 5. Collapse all whitespace to single spaces
    .replace(/\s+/g, ' ')
    // 6. Lowercase
    .toLowerCase()
    // 7. Trim
    .trim();
}

async function hashToS(normalizedText: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(normalizedText);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
```

### Proactive Monitoring Architecture (Server-Side Crawling)

For users who "track" a service (e.g., "Tell me if Google changes their ToS"), the server needs to crawl periodically:

```
┌─────────────────────────────────────────────────────────┐
│                    Supabase Backend                      │
│                                                         │
│  pg_cron (runs daily at 03:00 UTC)                      │
│       │                                                 │
│       ▼                                                 │
│  Edge Function: "monitor-tos-changes"                   │
│       │                                                 │
│       ├── 1. Query UNIQUE tracked domains               │
│       │     (deduplicated — 5000 users tracking         │
│       │      google.com = 1 crawl, not 5000)            │
│       │                                                 │
│       ├── 2. For each domain (batched, rate-limited):   │
│       │     ├── Fetch ToS URL                           │
│       │     ├── normalize() → hash()                    │
│       │     ├── Compare to latest hash in tos_versions  │
│       │     │                                           │
│       │     ├── UNCHANGED → skip                        │
│       │     │                                           │
│       │     └── CHANGED →                               │
│       │           ├── Run LLM analysis on new text      │
│       │           ├── Insert new tos_versions entry     │
│       │           ├── Insert/update tos_cache entry     │
│       │           ├── Compute severity delta            │
│       │           │   (was B, now C = escalation!)      │
│       │           └── Insert into notifications table   │
│       │                 for all users tracking this     │
│       │                 domain                          │
│       │                                                 │
│       └── 3. Log crawl results for monitoring           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Notification Delivery to Extension

Instead of Web Push (complex, overkill), the extension polls on its existing Chrome Alarm:

```
Extension (Chrome Alarm, every 6 hours for free / every 1 hour for Pro)
       │
       ▼
Edge Function: "get-notifications"
  Request:  { device_id }
  Response: {
    notifications: [
      {
        domain: "google.com",
        service_name: "Google",
        old_severity: 1,    // was Grade B
        new_severity: 2,    // now Grade C
        change_summary: "Added mandatory arbitration clause, expanded data sharing",
        changed_at: "2026-06-18T03:00:00Z"
      }
    ]
  }
       │
       ▼
chrome.notifications.create({
  title: "⚠️ Google updated their Terms",
  message: "Severity escalated from B → C. Tap to review changes."
})
```

### Monitoring Frequency by Tier

| Tier | Crawl Frequency | Notification Polling | Tracked Domains |
|------|----------------|---------------------|-----------------|
| **Free** | Daily (shared crawl) | Every 6 hours | Up to 5 services |
| **Pro** | Every 6 hours | Every 1 hour | Unlimited |

---

## Complete Database Schema

```sql
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
-- ROW LEVEL SECURITY
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
    FOR ALL USING (user_id = (current_setting('app.current_user_id'))::uuid);

CREATE POLICY "Own notifications" ON notifications
    FOR ALL USING (user_id = (current_setting('app.current_user_id'))::uuid);

-- ============================================
-- CRON JOBS
-- ============================================

-- Daily: crawl tracked domains for ToS changes
SELECT cron.schedule(
  'monitor-tos-changes',
  '0 3 * * *',  -- 3:00 AM UTC daily
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') 
           || '/functions/v1/monitor-tos-changes',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Daily: reset free tier scan counts
SELECT cron.schedule(
  'reset-daily-scans',
  '0 0 * * *',  -- midnight UTC
  $$
  UPDATE anon_users SET scans_today = 0
  WHERE last_scan_date < CURRENT_DATE;
  $$
);

-- Weekly: clean expired cache entries
SELECT cron.schedule(
  'cleanup-expired-cache',
  '0 4 * * 0',  -- 4:00 AM UTC every Sunday
  $$
  DELETE FROM tos_cache WHERE expires_at < now();
  $$
);
```

---

## Complete Edge Function Specifications

```
supabase/functions/
│
├── analyze/index.ts
│   POST: { tos_text, domain, device_id }
│   → Validate device + check quota
│   → Hash text → check Redis → check Supabase cache
│   → MISS: call LLM (Groq → fallback chain) → store result
│   → Return: { analysis_result, cache_hit, severity }
│
├── register-device/index.ts
│   POST: { }  (no payload needed)
│   → Generate UUID → insert anon_users
│   → Return: { device_id, tier: "free" }
│
├── check-quota/index.ts
│   GET: ?device_id=xxx
│   → Lookup anon_users
│   → Return: { scans_today, limit, tier, can_scan }
│
├── track-service/index.ts
│   POST: { device_id, domain, tos_url }
│   → Check tracking limit (free: 5, pro: unlimited)
│   → Insert tracked_services
│   → Return: { success, tracked_count }
│
│   DELETE: { device_id, domain }
│   → Remove from tracked_services
│
├── get-notifications/index.ts
│   GET: ?device_id=xxx
│   → Fetch unread notifications for user
│   → Mark as read
│   → Return: { notifications[] }
│
├── monitor-tos-changes/index.ts  (called by pg_cron)
│   POST: { }  (service_role only)
│   → Query monitored_domains view
│   → Batch crawl (rate-limited, 10 concurrent max)
│   → For each changed domain: re-analyze, insert notifications
│   → Return: { crawled, changed, errors }
│
├── cache-sync/index.ts  (for offline product)
│   GET: ?since=timestamp
│   → Return compressed cache entries since timestamp
│   → Used by Private edition to sync IndexedDB
│
└── health/index.ts
    GET:
    → Check DB connectivity
    → Check Redis connectivity
    → Check LLM provider reachability
    → Return: { status, db, redis, llm, version }
```

---

## Monorepo Structure

```
blindsight/
│
├── packages/
│   │
│   ├── core/                          ← SHARED: types, detector, extractor, overlay, utils
│   │   ├── src/
│   │   │   ├── detector/
│   │   │   │   ├── index.ts           ← Main detection orchestrator
│   │   │   │   ├── signals.ts         ← Signal definitions (weights, patterns)
│   │   │   │   └── scorer.ts          ← Confidence scoring engine
│   │   │   │
│   │   │   ├── extractor/
│   │   │   │   ├── index.ts           ← Strategy orchestrator
│   │   │   │   ├── strategies/
│   │   │   │   │   ├── inline.ts      ← Current page / inline ToS
│   │   │   │   │   ├── link-discovery.ts
│   │   │   │   │   ├── well-known.ts  ← /terms, /tos path guessing
│   │   │   │   │   └── background-fetch.ts  ← Cross-origin via SW
│   │   │   │   └── html-parser.ts     ← Single HTML→text implementation
│   │   │   │
│   │   │   ├── overlay/               ← Shadow DOM overlay system
│   │   │   │   ├── manager.ts         ← Lifecycle (create/destroy)
│   │   │   │   ├── renderer.ts        ← Safe DOM rendering
│   │   │   │   ├── styles.css         ← Scoped CSS (loaded via getURL)
│   │   │   │   └── components/
│   │   │   │       ├── toast.ts
│   │   │   │       ├── modal.ts
│   │   │   │       ├── countdown.ts
│   │   │   │       └── confirmation.ts
│   │   │   │
│   │   │   ├── types/
│   │   │   │   ├── analysis.ts        ← ScanResult, Clause (with Zod)
│   │   │   │   ├── messages.ts        ← Discriminated union messages
│   │   │   │   ├── settings.ts        ← Settings schema
│   │   │   │   └── api.ts             ← Request/response types
│   │   │   │
│   │   │   ├── utils/
│   │   │   │   ├── logger.ts          ← Structured logging
│   │   │   │   ├── config.ts          ← Centralized constants
│   │   │   │   ├── normalize.ts       ← ToS text normalization
│   │   │   │   ├── hash.ts            ← SHA-256 hashing
│   │   │   │   ├── sanitize.ts        ← escapeHtml, URL validation
│   │   │   │   └── errors.ts          ← Custom error types
│   │   │   │
│   │   │   └── index.ts               ← Public API barrel export
│   │   │
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── cloud/                         ← BLINDSIGHT CLOUD extension
│   │   ├── src/
│   │   │   ├── background/
│   │   │   │   ├── index.ts           ← Event listeners only
│   │   │   │   ├── message-router.ts
│   │   │   │   ├── api-gateway.ts     ← Supabase client + Edge Function calls
│   │   │   │   ├── alarm-manager.ts   ← Monitoring alarms + notification polling
│   │   │   │   ├── badge-manager.ts
│   │   │   │   └── context-menu.ts
│   │   │   │
│   │   │   ├── content/
│   │   │   │   └── index.ts           ← Imports core detector/extractor/overlay
│   │   │   │
│   │   │   ├── popup/                 ← React + Zustand
│   │   │   │   ├── App.tsx
│   │   │   │   ├── main.tsx
│   │   │   │   ├── index.html
│   │   │   │   ├── index.css
│   │   │   │   ├── store/             ← Zustand stores
│   │   │   │   │   ├── scan-store.ts
│   │   │   │   │   └── settings-store.ts
│   │   │   │   └── components/
│   │   │   │       ├── Header.tsx
│   │   │   │       ├── ScanButton.tsx
│   │   │   │       ├── ResultCard.tsx
│   │   │   │       ├── ClauseItem.tsx
│   │   │   │       ├── HistorySection.tsx
│   │   │   │       ├── QuotaIndicator.tsx  ← "3/5 scans used today"
│   │   │   │       ├── NotificationBell.tsx ← ToS change alerts
│   │   │   │       └── ErrorBoundary.tsx
│   │   │   │
│   │   │   ├── options/               ← React-based (unified tech stack)
│   │   │   │   ├── App.tsx
│   │   │   │   ├── main.tsx
│   │   │   │   └── index.html
│   │   │   │
│   │   │   └── assets/
│   │   │       ├── icon-16.png
│   │   │       ├── icon-48.png
│   │   │       └── icon-128.png
│   │   │
│   │   ├── manifest.json              ← Cloud permissions (host_permissions: <all_urls>)
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.js
│   │   └── package.json
│   │
│   └── private/                       ← BLINDSIGHT PRIVATE (skeleton for now)
│       ├── src/
│       │   ├── background/            ← WebLLM engine, IndexedDB cache
│       │   ├── content/               ← Imports same core modules
│       │   ├── popup/                 ← Adds model download UI
│       │   └── services/
│       │       ├── local-analyzer.ts  ← WebLLM integration
│       │       └── cache-sync.ts      ← IndexedDB sync from Supabase
│       ├── manifest.json              ← NO host_permissions
│       └── package.json
│
├── supabase/
│   ├── config.toml
│   ├── functions/                     ← Edge Functions (listed above)
│   ├── migrations/                    ← SQL migrations (schema above)
│   └── seed.sql                       ← Initial data (top 100 domain cache seeds)
│
├── turbo.json
├── pnpm-workspace.yaml
├── .github/
│   └── workflows/
│       ├── ci.yml                     ← Lint + typecheck + test
│       ├── deploy-staging.yml         ← Auto-deploy Edge Functions
│       └── release.yml                ← Build + CWS upload
│
├── LICENSE                            ← Proprietary license
├── CHROMEWEBSTORE.md                  ← CWS listing metadata
└── README.md
```

---

## Implementation Phases

### Phase 0: Foundation (Week 1-2)

> Monorepo setup, license change, critical security fixes.

#### Tasks
- [ ] Initialize pnpm workspace + Turborepo
- [ ] Create `packages/core`, `packages/cloud`, `packages/private` (skeleton)
- [ ] Move existing code into monorepo structure
- [ ] Replace MIT license with proprietary EULA
- [ ] Add copyright headers to all source files
- [ ] **Fix XSS**: Replace all `innerHTML` in blocker.ts with DOM API + Shadow DOM
- [ ] **Fix false-safe bug**: Parsing failure → "Analysis Failed" (not Grade A)
- [ ] **Remove hardcoded secrets**: API key `blindsight_key_1` and `localhost:8000`
- [ ] **Fix detector**: Remove "sign in"/"login" from signup keywords
- [ ] **Fix ClauseItem**: Repair broken severity badge styling
- [ ] Add URL allowlist for cross-origin fetch proxy
- [ ] Set up ESLint + Prettier for monorepo
- [ ] Verify the cloud extension builds and loads in Chrome

---

### Phase 1: Supabase Backend (Week 3-4)

> Database, Edge Functions, cache system, anonymous auth.

#### Tasks
- [ ] Create Supabase project
- [ ] Apply database migration (full schema above)
- [ ] Configure Row Level Security policies
- [ ] Set up Upstash Redis instance
- [ ] Store LLM API keys (Groq, Gemini, OpenAI) in Supabase Vault
- [ ] **Move LLM prompt server-side** (out of extension code — protect the IP)
- [ ] Implement Edge Functions:
  - [ ] `register-device` — anonymous UUID generation
  - [ ] `analyze` — cache check → LLM fallback chain → store result
  - [ ] `check-quota` — free tier enforcement
  - [ ] `track-service` — add/remove tracked domains
  - [ ] `get-notifications` — fetch pending ToS change alerts
  - [ ] `health` — deep health check
- [ ] Implement text normalization + hashing in Edge Function
- [ ] Add circuit breaker for LLM provider failover
- [ ] Add Zod validation on all LLM responses
- [ ] Add prompt injection defenses (input framing, output validation)
- [ ] Add request timeout (30s per provider) + retry (2x with backoff)
- [ ] Test full flow: extension → Edge Function → LLM → cache → response

---

### Phase 2: Core Package Refactor (Week 5-6)

> Restructure shared code, fix all architecture problems.

#### Tasks
- [ ] **Detector overhaul**:
  - [ ] Fix login/signup misclassification
  - [ ] Add Shadow DOM traversal
  - [ ] Add debounced MutationObserver (100ms)
  - [ ] Cache detection results per-page
  - [ ] Externalize signal weights to config
- [ ] **Extractor overhaul**:
  - [ ] Decompose into strategy pattern
  - [ ] Parallel strategy execution (race)
  - [ ] Add retry logic per strategy
  - [ ] Single HTML→text implementation (kill the duplicate)
  - [ ] Consistent min-length thresholds
- [ ] **Overlay rewrite (Shadow DOM)**:
  - [ ] Shadow DOM isolation
  - [ ] DOM API rendering (zero innerHTML)
  - [ ] Component-based (toast, modal, countdown, confirmation)
  - [ ] CSS file loaded via `chrome.runtime.getURL`
  - [ ] ARIA labels, focus trapping, keyboard nav
  - [ ] Severity via color + icon + text (not color alone)
- [ ] **Type system overhaul**:
  - [ ] Zod schemas for all API boundaries
  - [ ] Discriminated union messages
  - [ ] Fix `severityToGrade` fallback
  - [ ] Strict enums everywhere
- [ ] **Background service worker split**:
  - [ ] Replace global Map with `chrome.storage.session`
  - [ ] Split into message-router, api-gateway, alarm-manager, badge-manager
  - [ ] Integrate Supabase client
- [ ] **Popup refactor**:
  - [ ] Wire Zustand for state management
  - [ ] Add error boundaries
  - [ ] Add loading/error/empty states
  - [ ] Add QuotaIndicator component
  - [ ] Add NotificationBell component
  - [ ] Fix version inconsistency (single source of truth from package.json)
- [ ] **Options page rewrite**:
  - [ ] Rewrite as React (unified tech stack)
  - [ ] Remove all inline JavaScript
  - [ ] Add settings validation
  - [ ] Add storage migration logic

---

### Phase 3: Production Infrastructure (Week 7-8)

> Testing, CI/CD, monitoring, CWS preparation.

#### Tasks
- [ ] **Testing**:
  - [ ] Set up Vitest for core + cloud packages
  - [ ] Unit tests for detector, extractor, normalizer, hasher
  - [ ] Unit tests for Edge Functions (supabase local dev)
  - [ ] Integration tests for full scan flow
  - [ ] Set up Playwright for extension E2E
  - [ ] Target: 80%+ coverage on core package
- [ ] **CI/CD (GitHub Actions)**:
  - [ ] PR workflow: lint → typecheck → unit tests → build
  - [ ] Merge workflow: deploy Edge Functions to staging → E2E
  - [ ] Release workflow: build extension → generate CWS ZIP
- [ ] **Monitoring**:
  - [ ] Sentry setup (extension + Edge Functions)
  - [ ] Supabase Dashboard alerts (DB size, function invocations)
  - [ ] Upstash Dashboard alerts (Redis memory, hit rate)
  - [ ] Custom analytics queries on scan_log table
- [ ] **ToS Monitoring setup**:
  - [ ] Enable pg_cron + pg_net extensions
  - [ ] Implement `monitor-tos-changes` Edge Function
  - [ ] Schedule daily crawl cron job
  - [ ] Schedule daily scan count reset
  - [ ] Schedule weekly cache cleanup
  - [ ] Test full monitoring flow: track → change → notification
- [ ] **CWS Preparation**:
  - [ ] Create `CHROMEWEBSTORE.md` with all metadata
  - [ ] Write permission justifications (especially `<all_urls>`)
  - [ ] Draft privacy policy
  - [ ] Prepare store listing copy
  - [ ] Generate screenshots (1280×800)

---

### Phase 4: Polish + Ship V1 (Week 9-10)

> Accessibility, performance, final QA, Chrome Web Store submission.

#### Tasks
- [ ] **Accessibility**:
  - [ ] Full ARIA support on overlay components
  - [ ] Focus management in modals
  - [ ] Keyboard shortcuts (Escape to dismiss, Tab navigation)
  - [ ] Screen reader testing (VoiceOver)
  - [ ] High-contrast mode
- [ ] **Performance**:
  - [ ] Debounced detection (100ms throttle)
  - [ ] LRU cache for detection results
  - [ ] Redis hot cache <100ms response
  - [ ] Lazy-load overlay components
- [ ] **i18n foundation**:
  - [ ] Extract all strings to `_locales/en/messages.json`
  - [ ] Structure for future translation
- [ ] **Free tier enforcement**:
  - [ ] 5 scans/day counter
  - [ ] Upgrade prompt in popup
  - [ ] Graceful "quota reached" UX
- [ ] **QA**:
  - [ ] Test on 30+ real websites
  - [ ] Test service worker termination + recovery
  - [ ] Test all LLM providers down (graceful degradation)
  - [ ] XSS testing with crafted responses
  - [ ] Prompt injection testing
  - [ ] Rate limit stress test
- [ ] **Ship**:
  - [ ] Chrome Web Store submission
  - [ ] Downloadable cache bundle (`.json`) for offline product
  - [ ] Landing page / product site

---

### Phase 5: Private Edition (Weeks 11-14, after Cloud V1 is stable)

> Deferred. Build on the stable core package.

- [ ] WebLLM integration (Llama 3.2-1B)
- [ ] Simplified 3-tier system prompt (~1,500 tokens)
- [ ] IndexedDB cache sync from Supabase
- [ ] Model download UI with progress
- [ ] One-time purchase pricing
- [ ] Separate CWS listing

---

## Verification Plan

### Automated
```bash
# Monorepo-wide lint + typecheck
pnpm turbo lint typecheck

# Core unit tests
pnpm --filter @blindsight/core test

# Cloud extension tests
pnpm --filter @blindsight/cloud test

# E2E tests
pnpm --filter @blindsight/cloud test:e2e

# Edge Function tests (local Supabase)
supabase functions serve --env-file .env.local
pnpm test:functions

# Security audit
pnpm audit
```

### Manual
- Install extension → scan 30 real websites (mix of clean/predatory ToS)
- Verify cache hit on second scan (should be <100ms)
- Verify cache miss when ToS text differs
- Scan 6th time on free tier → quota enforced
- Track a service → manually change its cached hash → verify notification appears
- Kill service worker → verify state persists in `chrome.storage.session`
- Take Groq offline → verify Gemini fallback activates
- Submit to CWS staging channel

---

## Timeline Summary

```
Week 1-2   ████░░░░░░░░░░░░░░░░  Phase 0: Foundation
Week 3-4   ░░░░████░░░░░░░░░░░░  Phase 1: Supabase Backend
Week 5-6   ░░░░░░░░████░░░░░░░░  Phase 2: Core Refactor
Week 7-8   ░░░░░░░░░░░░████░░░░  Phase 3: Infra + CI/CD
Week 9-10  ░░░░░░░░░░░░░░░░████  Phase 4: Polish + Ship
                                  ─── Cloud V1 on CWS ───
Week 11-14 ░░░░░░░░░░░░░░░░░░░░  Phase 5: Private Edition
```

> [!IMPORTANT]
> **This plan is ready to execute.** Phase 0 starts with the monorepo setup and critical security fixes. Approve this and we break ground.
