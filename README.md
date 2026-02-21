# Blind-Sight v4.0

> Your Legal Firewall — Scans Terms of Service for harmful clauses and protects you before you click Accept.

## What's New in v4

- **React + TypeScript** — Full rewrite from vanilla JS to React 18 with strict TypeScript
- **Vite Build System** — Lightning-fast HMR with @crxjs/vite-plugin for Chrome extension dev
- **Tailwind CSS** — Utility-first styling with custom design tokens
- **Component Architecture** — Modular popup UI with reusable components
- **Type Safety** — Comprehensive type definitions for all scan results, messages, and state

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | React 18 |
| Language | TypeScript 5.3 |
| Build Tool | Vite 5 + @crxjs/vite-plugin |
| Styling | Tailwind CSS 3.4 |
| Extension API | Chrome Manifest V3 |
| AI Engine | OpenAI GPT-4o Mini |

## Project Structure

```
src/
├── background/     # Service worker (analyze, history, badge)
├── content/        # Content scripts (detector, extractor, blocker)
├── lib/            # Shared types, OpenAI client, storage helpers
├── options/        # Settings page (API key config)
└── popup/          # React popup UI
    ├── components/ # Header, ScanButton, ResultCard, etc.
    ├── App.tsx     # Main app component
    └── main.tsx    # React entry point
```

## Setup

1. Clone this repo
2. `npm install`
3. `npm run build`
4. Load `dist/` as unpacked extension in Chrome
5. Add your OpenAI API key in Settings

## License

MIT
