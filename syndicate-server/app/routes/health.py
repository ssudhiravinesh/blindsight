"""
Health check endpoint.
"""

from fastapi import APIRouter
from app.config import get_settings

router = APIRouter()
settings = get_settings()

@router.get("/health")
async def health_check():
    """Return server status, model name, and version."""
    return {
        "status": "ok",
        "model": settings.MODEL_NAME,
        "version": settings.APP_VERSION,
    }
