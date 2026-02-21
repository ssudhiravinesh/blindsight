"""
X-API-Key authentication middleware.
Validates the X-API-Key header against the list of allowed keys
stored in the ALLOWED_API_KEYS environment variable.
"""

from fastapi import HTTPException, Security
from fastapi.security import APIKeyHeader

from app.config import get_settings

settings = get_settings()

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

async def require_api_key(
    api_key: str | None = Security(api_key_header),
) -> str:
    """
    FastAPI dependency that validates the X-API-Key header.

    Returns the validated key on success.
    Raises 401 if missing, 403 if invalid.
    """
    if api_key is None:
        raise HTTPException(
            status_code=401,
            detail="Missing X-API-Key header.",
        )

    allowed = settings.allowed_keys_list
    if not allowed:
        return api_key

    if api_key not in allowed:
        raise HTTPException(
            status_code=403,
            detail="Invalid API key.",
        )

    return api_key
