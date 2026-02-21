# Blind-Sight

Chrome extension that scans Terms of Service for harmful clauses and blocks the Accept button with severity-graded warnings.

## Stack
- React 18 + TypeScript 5.3
- Vite 5 + @crxjs/vite-plugin
- Tailwind CSS 3.4
- Chrome Manifest V3
- FastAPI backend with Llama 3.3 70B via Groq

## Setup
```
npm install
npm run build
```
Load `dist/` folder as unpacked extension in chrome://extensions (developer mode).

Add your API key in extension settings or use the built-in server.

## License
MIT
