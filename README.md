# Blind-Sight

**A legal firewall for your browser.** Blind-Sight is a Chrome extension that notices when you are about to sign up for a service, finds that service's Terms of Service, has an LLM grade it on a four-tier severity scale, and — for aggressive terms — puts a warning in front of the *Accept* button before you click it. It can then keep watching those terms and notify you when they change.

Free to use, no accounts, no tracking.

---

## Highlights

- **Point-of-consent detection** — heuristic signup/login scoring over the live DOM (incl. shadow DOM), re-evaluated on mutations.
- **Multi-strategy ToS extraction** — current page → inline text → discovered links → well-known paths, with a hardened background fetch as fallback.
- **Severity-graded UX** — Shadow-DOM-isolated overlays; "type to unlock" friction for critical terms; safer alternatives per category.
- **Cost-aware backend** — Supabase Edge Functions with a two-level cache (Upstash Redis hot / Postgres cold) keyed by a normalised SHA-256 of the document, so a popular ToS is analysed once.
- **Change monitoring** — nightly server-side crawler re-hashes tracked ToS pages, re-grades changed ones and queues per-device notifications.
- **Bring your own key** — optional OpenAI/Gemini key runs analysis locally against the same canonical prompt.

## Architecture

```
┌──────────────────── Chrome extension (MV3) ────────────────────┐
│ content script ── detector / extractor / overlay (Shadow DOM)  │
│        │ runtime messages (sender-checked)                     │
│ service worker ── SSRF-guarded ToS fetch · local LRU cache     │
│        │ HTTPS + X-Device-Id / X-Device-Secret                 │
└────────┼───────────────────────────────────────────────────────┘
         ▼
┌──────────────── Supabase Edge Functions (Deno) ────────────────┐
│ register-device   issue device credential (hash stored)        │
│ analyze           auth → rate limit → validate → cache → LLM   │
│ track-service     watch a service's ToS (same-site URL only)   │
│ get-notifications pull change notifications                    │
│ monitor-tos-changes  cron-only crawler (CRON_SECRET)           │
│ health            liveness; details behind CRON_SECRET         │
│        │                         │                             │
│   Postgres (RLS, default-deny)   Groq → Gemini fallback        │
│   pg_cron + Vault                Upstash Redis (optional)      │
└────────────────────────────────────────────────────────────────┘
```

| Path | Contents |
|---|---|
| `packages/core` | Shared library: detector, extractor strategies, overlays, API client, types |
| `packages/cloud` | The Chrome extension (React popup, options page, service worker, content script) |
| `packages/private` | Placeholder for a future fully-local (WebLLM) edition |
| `supabase/functions/_shared` | Single source of truth used by **both** backend and extension: prompt, text normalisation, LLM-output validation, network guards |
| `supabase/migrations` | Schema, RLS lockdown, rate limiter, cron jobs |
| `supabase/tests` | pgTAP tests asserting database security invariants |

## Security

Security is a first-class feature; see **[SECURITY.md](SECURITY.md)** for the full threat model. In short:

- **Device authentication** with a 256-bit secret, stored only as a SHA-256 hash and compared in constant time.
- **Default-deny database**: RLS enabled and forced on every table, no grants to public API roles, `SECURITY DEFINER` functions locked down — enforced by pgTAP in CI.
- **SSRF protection** on every user-influenced fetch: public-IP-only (IPv4/IPv6, mapped & NAT64), DNS-resolution checks, per-hop redirect validation, size/time/content-type limits.
- **Untrusted LLM output**: every model response is schema-validated and sanitised before it is cached or rendered (https-only links, bounded fields); ToS text is delimited as data in prompts.
- **Abuse protection** via atomic Postgres-backed rate limits per device and per (salted, hashed) IP.
- **Hardened extension**: minimal permissions, strict extension CSP, sender-checked messaging, no `innerHTML`, opt-in error reporting with URL scrubbing.
- **Supply chain**: frozen lockfile, `pnpm audit` gate, CodeQL, Dependabot, pinned Deno imports and Supabase CLI.

## Getting started

Requirements: Node 20+, pnpm 10 (`corepack enable`), and for the backend Docker + [Supabase CLI](https://supabase.com/docs/guides/cli) + Deno 2.

```bash
pnpm install
pnpm build            # builds packages/cloud/dist — load it via chrome://extensions → "Load unpacked"
pnpm lint && pnpm typecheck && pnpm test
```

Point the extension at your own backend by copying `packages/cloud/.env.example` to `.env.local`.

### Backend (local)

```bash
supabase start                      # applies all migrations
supabase test db                    # pgTAP security tests
supabase functions serve --env-file supabase/.env.local
cd supabase/functions && deno lint --config deno.json && deno check --config deno.json */index.ts
```

Function secrets (`supabase secrets set …` in production):

| Name | Purpose |
|---|---|
| `GROQ_API_KEY`, `GEMINI_API_KEY` | LLM providers (Groq primary, Gemini fallback) |
| `TYPESAFE_API_KEY` | Optional. Verifies each LLM analysis with [Jev](https://docs.typesafe.ai): drops clauses not found in the document and calibrates severities (at most ±1 tier) |
| `JEV_MODEL` | Optional Jev model ID (default `jev-1.14.0`) |
| `CRON_SECRET` | ≥32 random chars; authorises the crawler and detailed health |
| `ALLOWED_ORIGINS` | Comma-separated, e.g. `chrome-extension://<extension-id>` |
| `RATE_LIMIT_SALT` | Random salt for hashing client IPs |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Optional hot cache |
| `SENTRY_DSN` | Optional backend error reporting |

The nightly crawler reads its target and credentials from Vault:

```sql
select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
select vault.create_secret('<same value as CRON_SECRET>', 'cron_secret');
```

## CI/CD

- **CI** — extension lint/types/tests/build + dependency audit; Deno lint/typecheck of edge functions; migrations applied to a fresh database followed by pgTAP tests.
- **CodeQL** — `security-extended` queries on every PR and weekly.
- **Deploy Staging** — runs only after CI succeeds on `main`: `supabase db push` then function deploy.
- **Release** — tagging `v*` builds and attaches the packaged extension zip.

## License

Proprietary — see [LICENSE](LICENSE).
