"""
POST /api/v1/analyze — ToS analysis endpoint.
Protected by X-API-Key auth and rate limited.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from app.middleware.auth import require_api_key
from app.middleware.rate_limit import limiter
from app.services.llm_service import analyze_tos

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Request / Response models ────────────────────────────────────
class AnalyzeRequest(BaseModel):
    tos_text: str = Field(
        ...,
        max_length=30000,
        description="Raw Terms of Service text to analyze.",
    )
    source_url: str | None = Field(
        default=None,
        description="Optional URL the ToS was scraped from.",
    )


class ClauseItem(BaseModel):
    type: str
    severity: int
    quote: str
    explanation: str
    mitigation: str | None = None


class AnalyzeResponse(BaseModel):
    overallSeverity: int
    category: str
    serviceName: str
    summary: str
    clauses: list[ClauseItem]


# ── Route ────────────────────────────────────────────────────────
@router.post("/analyze", response_model=AnalyzeResponse)
@limiter.limit("10/minute")
async def analyze_endpoint(
    request: Request,
    body: AnalyzeRequest,
    api_key: str = Depends(require_api_key),
):
    """Analyze Terms of Service text and return structured risk assessment."""
    if not body.tos_text.strip():
        raise HTTPException(status_code=400, detail="tos_text cannot be empty.")

    logger.info("Analyze request from key=%s…%s", api_key[:8], api_key[-4:])

    try:
        result = await analyze_tos(
            tos_text=body.tos_text,
            source_url=body.source_url,
        )
        return result
    except ValueError as exc:
        logger.error("Analysis failed: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("Unexpected error during analysis: %s", exc)
        raise HTTPException(
            status_code=500, detail="Internal server error during analysis."
        ) from exc
