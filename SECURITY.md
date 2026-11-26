# Security

## Reporting a vulnerability

Please report vulnerabilities privately via GitHub's **"Report a vulnerability"** (Security → Advisories) rather than a public issue. Include reproduction steps and impact; we aim to acknowledge within 72 hours.

## Threat model

Blind-Sight runs a content script on every page and calls a shared, LLM-backed API. The main adversaries are:

| Adversary | Goal |
|---|---|
| Malicious website | Abuse the extension's privileges (cross-origin fetches, UI injection), poison analyses via prompt injection |
| Anonymous internet client | Burn the shared LLM budget, read other users' data, pivot into internal networks (SSRF) |
| Compromised/leaked database | Impersonate devices |

## Controls

### Backend (Supabase Edge Functions)

| Threat | Control | Where |
|---|---|---|
| Impersonating a device | `register-device` issues a random 256-bit secret; only its SHA-256 is stored; constant-time comparison; unknown ids compared against a dummy hash to avoid timing oracles | `_shared/auth.ts` |
| Unauthenticated cron trigger / LLM budget burn | `monitor-tos-changes` requires `Authorization: Bearer $CRON_SECRET` and fails closed if the secret is unset | `_shared/auth.ts` |
| Flooding / scripted abuse | Atomic fixed-window rate limits in Postgres per device and per salted IP hash; fails closed | `_shared/rate-limit.ts`, migration `…000100` |
| SSRF via `tos_url` | Public http(s) only, default ports, no userinfo; DNS A/AAAA answers must be public; manual redirects re-validated per hop; 15 s timeout, 2 MB cap, text content types only; tracked URLs must be same-site as the tracked domain | `_shared/net-guard.ts`, `_shared/safe-fetch.ts` |
| Prompt injection / malicious model output | Document text delimited as data; responses parsed into a strict schema (clamped severities, enum checks, length caps, control-char stripping, https-only links) before caching or returning; cache re-validated on read and namespaced by prompt version | `_shared/llm.ts`, `_shared/analysis.ts` |
| Information disclosure | Generic error bodies with correlation ids; provider/DB errors only in logs; `health` details gated by the cron secret; security headers on all responses | `_shared/http.ts` |
| Cross-origin browser abuse | CORS allowlist via `ALLOWED_ORIGINS`; no cookies are used, so CSRF is not applicable | `_shared/http.ts` |
| Oversized input | Body size limits, ToS length limit, hostname validation | `analyze`, `track-service` |
| Secrets in URLs | Gemini key sent via `x-goog-api-key` header | `_shared/llm.ts` |

### Database

- RLS **enabled and forced** on every table; anon/authenticated roles have **no grants** (edge functions use the service role).
- `monitored_domains` is a `security_invoker` view (it previously exposed every tracked domain through the public API).
- `SECURITY DEFINER` functions pin `search_path` and are executable only by `service_role`.
- Cron credentials come from Supabase Vault, not migration files.
- Invariants are asserted by `supabase/tests/database/security.test.sql` in CI.

### Extension

- Minimal permissions (`storage`, `alarms`, `notifications`, `contextMenus`); no `scripting`/`activeTab`; popup not web-accessible.
- Strict `extension_pages` CSP (`script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'`).
- Runtime messages accepted only from the extension itself.
- Background ToS fetches use the shared SSRF guard, `credentials: 'omit'`, no referrer, post-redirect URL re-check, size/type/time limits.
- Overlays are built with DOM APIs only (no `innerHTML`) inside a Shadow DOM; `href`/`src` restricted to http(s).
- Error reporting is opt-in at build time, 5% sampling, no PII, page URLs reduced to origins.

### Supply chain

`pnpm install --frozen-lockfile`, `pnpm audit` gate in CI, CodeQL `security-extended`, Dependabot, pinned Deno imports (`supabase/functions/deno.json`) and Supabase CLI version, least-privilege workflow permissions, deploys gated on green CI.

## Known limitations

- **DNS rebinding**: DNS is checked before each fetch, but the runtime re-resolves when connecting; a fast-rebinding host could in theory swap answers in between. The edge runtime has no internal network of value and requests carry no credentials, which limits impact.
- **Extension-side DNS**: browsers expose no DNS API to extensions, so the background fetch guard validates hostnames/IP literals but cannot detect public names that resolve to private addresses.
- **Anonymous devices**: anyone can register a device; abuse is bounded by per-IP registration and request rate limits rather than identity.
- **Same-site heuristic**: without a public-suffix list, uncommon multi-level suffixes may be treated as one site.
