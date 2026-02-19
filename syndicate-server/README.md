# Syndicate Server

API gateway for the **Blind-Sight** Chrome Extension — scans Terms of Service for harmful clauses using **Llama 3.3 70B** via [Groq](https://groq.com/).

## Architecture

```
Chrome Extension → Syndicate Server (FastAPI) → Groq API (Llama 3.3 70B)
```

## Quick Start

```bash
# 1. Clone & enter
cd syndicate-server

# 2. Create venv & install
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env with your GROQ_API_KEY and ALLOWED_API_KEYS

# 4. Run
uvicorn app.main:app --reload --port 8000
```

## API Endpoints

### `GET /api/v1/health`

```json
{ "status": "ok", "model": "llama-3.3-70b-versatile", "version": "1.0.0" }
```

### `POST /api/v1/analyze`

**Headers:** `X-API-Key: your_key`, `Content-Type: application/json`

**Request:**
```json
{
  "tos_text": "Full text of the Terms of Service (max 30,000 chars)",
  "source_url": "https://example.com/tos (optional)"
}
```

**Response:**
```json
{
  "overallSeverity": 0,
  "category": "social_media",
  "serviceName": "Example Service",
  "summary": "Standard terms with no significant concerns.",
  "clauses": [
    {
      "type": "DATA_SELLING",
      "severity": 2,
      "quote": "We share your data with advertising partners.",
      "explanation": "Your data may be shared with third-party advertisers.",
      "mitigation": "Opt-out available in privacy settings."
    }
  ]
}
```

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `GROQ_API_KEY` | Your Groq API key | required |
| `ALLOWED_API_KEYS` | Comma-separated allowed client keys | *(dev: allow all)* |
| `PORT` | Server port | `8000` |
| `RATE_LIMIT` | Request limit per key | `10/minute` |

## Project Structure

```
syndicate-server/
├── app/
│   ├── main.py              # FastAPI app, CORS, rate limiter
│   ├── config.py            # Pydantic Settings
│   ├── routes/
│   │   ├── health.py        # GET /api/v1/health
│   │   └── analyze.py       # POST /api/v1/analyze
│   ├── services/
│   │   └── llm_service.py   # Groq client (OpenAI-compatible)
│   ├── middleware/
│   │   ├── auth.py          # X-API-Key validation
│   │   └── rate_limit.py    # slowapi rate limiting
│   └── prompts/
│       └── tos_analyzer.py  # System prompt
├── requirements.txt
├── Procfile
├── .env.example
└── README.md
```

## Deployment

### Railway / Render

1. Push to GitHub
2. Connect repo in Railway/Render dashboard
3. Set environment variables (`GROQ_API_KEY`, `ALLOWED_API_KEYS`)
4. Deploy — the `Procfile` handles startup automatically

## Tech Stack

- **FastAPI** — async Python web framework
- **Groq API** — OpenAI-compatible inference for Llama 3.3 70B
- **slowapi** — rate limiting per API key
- **Pydantic** — request/response validation & settings

---

*Built for the Blind-Sight Chrome Extension by the SYNDICATE Team.*
