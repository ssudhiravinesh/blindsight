"""
Rate limiting middleware using slowapi.
Limits requests per API key (from the X-API-Key header).
"""

from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.config import get_settings

settings = get_settings()


def _get_key(request: Request) -> str:
    """
    Extract the rate-limit key from the request.
    Uses X-API-Key if present, otherwise falls back to IP address.
    """
    api_key = request.headers.get("X-API-Key")
    if api_key:
        return api_key
    return get_remote_address(request)


# ── Limiter instance ─────────────────────────────────────────────
limiter = Limiter(key_func=_get_key, default_limits=[settings.RATE_LIMIT])


async def rate_limit_exceeded_handler(
    request: Request, exc: RateLimitExceeded
) -> JSONResponse:
    """Custom handler for rate limit exceeded errors."""
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Rate limit exceeded. Please try again later.",
            "retry_after": str(exc.detail),
        },
    )
