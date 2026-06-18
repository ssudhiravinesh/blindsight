# Blind-Sight (Monorepo)

Chrome extension that scans Terms of Service for harmful clauses and blocks the Accept button with severity-graded warnings.

---

## Production Implementation Roadmap

This checklist tracks our progress as we scale Blindsight from a hackathon project to an industrial-grade, production-ready product.

- [x] **Phase 0: Foundation & Security (Completed)** — Turborepo + pnpm monorepo structure, licensing update, DOM XSS fixes, false-safe logic correction, SSRF protections, and UI badge repair.
- [x] **Phase 1: Supabase Backend** — Schema migrations, edge functions, cache syncing, Upstash Redis, anonymous device authentication, quota limits.
- [x] **Phase 2: Core Package Refactor** — Extraction strategy orchestrator, detector scoring overhaul, Shadow DOM overlay isolation, TypeScript/Zod API schemas.
- [x] **Phase 3: Production Infrastructure** — Unit/E2E testing (Vitest + Playwright), Sentry integration, cron jobs for ToS change crawling, GitHub CI/CD pipelines.
- [ ] **Phase 4: Polish + Ship V1** — i18n localization foundation, visual overlays accessibility audit, performance caching optimizations, Chrome Web Store submission materials.
- [ ] **Phase 5: Private Edition** — Local WebLLM (Llama 3.2-1B) background execution, IndexedDB synchronization, offline cash bundle download.

---

## Workspace Structure

- `packages/core`: Core scanning library (shared types, detector, extractor, overlay blocker).
- `packages/cloud`: Chrome extension using Cloud/Supabase architecture.
- `packages/private`: Chrome extension skeleton running WebLLM locally.

---

## Setup & Verification

Make sure you have `pnpm` installed.

### Install dependencies
```bash
npx pnpm install
```

### Validate Typecheck & Build
```bash
npx pnpm build
```

### Run Linter
```bash
npx pnpm lint
```
