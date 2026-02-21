"""
Syndicate Server — FastAPI entry point.
API gateway for the Blind-Sight Chrome Extension.
Routes Llama 3.3 70B analysis via Groq's OpenAI-compatible API.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.middleware.rate_limit import limiter
from app.routes import analyze, health, updates

settings = get_settings()

# ── App ──────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_TITLE,
    version=settings.APP_VERSION,
    description="API gateway for the Blind-Sight Chrome Extension — "
    "scans Terms of Service for harmful clauses using Llama 3.3 70B.",
)

# ── Rate Limiter ─────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ─────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "chrome-extension://*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────
app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(analyze.router, prefix="/api/v1", tags=["analyze"])
app.include_router(updates.router, prefix="/api/v1/tos", tags=["updates"])


# ── Root (for Railway healthcheck) ───────────────────────────────
@app.get("/")
async def root():
    return {"status": "ok", "service": "syndicate-server"}

