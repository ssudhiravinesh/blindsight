# Prompt: Integrate Syndicate Server Backend into BLINDSIGHT_3.0

Copy everything below this line and paste into a new session.

---

## Context

I have a Chrome Extension called **Blind-Sight** in `/Users/mav2713/ssa/SRM-Ultron/BLINDSIGHT_3.0/`. It's a TypeScript/Vite Chrome extension that scans Terms of Service for harmful clauses using AI. Git is already initialized in this folder.

I also have a **standalone FastAPI backend** called **Syndicate Server** at `/Users/mav2713/ssa/SRM-Ultron/syndicate-server/`. This is a separate project (its own git repo) that acts as an API gateway — it receives ToS text from the extension and routes it to Llama 3.3 70B via Groq's OpenAI-compatible API. This server replaces the current BYOK (bring-your-own-key) OpenAI approach.

## What the Syndicate Server does

- `GET /api/v1/health` → returns `{ "status": "ok", "model": "llama-3.3-70b-versatile", "version": "1.0.0" }`
- `POST /api/v1/analyze` → accepts `{ "tos_text": "...", "source_url": "..." }` with header `X-API-Key: blindsight_key_1` and returns the exact same JSON schema the extension already expects:
```json
{
  "overallSeverity": 0-3,
  "category": "social_media|vpn|email|...",
  "serviceName": "...",
  "summary": "...",
  "clauses": [{ "type": "...", "severity": 0-3, "quote": "...", "explanation": "...", "mitigation": "..." }]
}
```
- Auth: `X-API-Key` header (server validates against `ALLOWED_API_KEYS` env var)
- Rate limiting: 10 req/min per key via slowapi
- CORS: allows `chrome-extension://*` origins

## Current extension architecture (BLINDSIGHT_3.0)

The extension is a **TypeScript/Vite** project. Source files are in `src/`, built output goes elsewhere. Key files:

### `src/lib/openai.ts` (LLM client)
- Exports `analyzeTOS(apiKey: string, tosText: string): Promise<ScanResult>` which calls OpenAI directly
- Uses `gpt-4o-mini` model, `response_format: { type: 'json_object' }`
- Has `parseResponse()` for normalizing LLM output
- Has `getSeverityInfo()` for severity → color/icon mapping
- Imports types from `src/lib/types.ts` (`ScanResult`, `SeverityKey`)

### `src/background/index.ts` (service worker)
- Imports `analyzeTOS` from `../lib/openai`
- Imports `getApiKey` from `../lib/storage`
- `handleAnalyzeTOS()` currently: gets API key → if no key returns error → calls `analyzeTOS(apiKey, tosText)` → sets badge → saves to history
- Listens for messages: `ANALYZE_TOS`, `FETCH_TOS`, `GET_LAST_RESULT`, `PAGE_DETECTED`, `AUTO_SCAN_COMPLETE`, `GET_HISTORY`

### `src/lib/types.ts` (shared types)
- Defines `ScanResult`, `SeverityKey`, `HistoryEntry`, etc.

### `src/lib/storage.ts`
- Exports `getApiKey()` that reads from `chrome.storage.local`

## What I need you to do

### 1. Move the syndicate-server into BLINDSIGHT_3.0
Copy the entire `syndicate-server/` directory into `BLINDSIGHT_3.0/` as a subfolder:
```
BLINDSIGHT_3.0/
├── src/                    # Extension source (TypeScript)
├── syndicate-server/       # Backend source (Python) ← NEW
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── routes/
│   │   ├── services/
│   │   ├── middleware/
│   │   └── prompts/
│   ├── requirements.txt
│   ├── Procfile
│   └── ...
├── manifest.json
├── vite.config.ts
└── ...
```

### 2. Modify `src/lib/openai.ts`
Add a new exported function `analyzeTOSviaServer(tosText: string, sourceUrl?: string): Promise<ScanResult>` that:
- POSTs to the Syndicate Server (`/api/v1/analyze`)
- Sends `X-API-Key: blindsight_key_1` header
- Sends `{ tos_text: text, source_url: sourceUrl }` as JSON body
- Parses response and normalizes it the same way `parseResponse()` does (clamp severity 0-3, ensure clauses array, set `lethal` flag)
- Returns a `ScanResult`
- The server URL should be a constant at the top: `const SYNDICATE_SERVER_URL = 'https://your-server.railway.app/api/v1/analyze';` (placeholder, I'll update after deploy)
- The API key should be: `const SYNDICATE_API_KEY = 'blindsight_key_1';`

### 3. Modify `src/background/index.ts`
Change `handleAnalyzeTOS()` to use a **server-first, OpenAI-fallback** strategy:
1. Try `analyzeTOSviaServer(tosText, sender.tab?.url)` first
2. If that fails, check if user has an OpenAI API key configured via `getApiKey()`
3. If they do, fall back to `analyzeTOS(apiKey, tosText)`
4. If both fail, return a clear error: "Analysis server unavailable and no OpenAI API key configured."
5. Remove the early `if (!apiKey) return error` check — API key is no longer required upfront since the server handles it

### 4. Commit it all
Stage everything and commit with a realistic message like "feat: add syndicate server backend + server-first analysis flow". Do NOT use `--date` flags — just a normal `git commit`.

### 5. Deploy guidance
After the code changes, tell me the exact steps to:
1. Deploy `syndicate-server/` to Railway (or Render)
2. Set the env vars (`GROQ_API_KEY`, `ALLOWED_API_KEYS`)
3. Update `SYNDICATE_SERVER_URL` in `src/lib/openai.ts` with the live URL

## Important notes
- The extension source is **TypeScript** — do NOT create `.js` files in `src/`. Use proper types.
- Import types from `../lib/types` as the existing code does.
- Do NOT touch the built output files (`lib/openai.js`, `background/background.js`) — Vite handles that.
- Do NOT modify any other extension files (popup, content scripts, options, etc.).
- The `syndicate-server/` has its own `.gitignore` that excludes `venv/`, `.env`, `__pycache__/` — make sure those don't leak into the commit.
- There is already a `venv/` inside `syndicate-server/` — do NOT commit it.
