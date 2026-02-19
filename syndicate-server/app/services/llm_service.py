"""
LLM Service — Groq-hosted Llama 3.3 70B via OpenAI-compatible API.
"""

import json
import logging

from openai import AsyncOpenAI

from app.config import get_settings
from app.prompts.tos_analyzer import SYSTEM_PROMPT

logger = logging.getLogger(__name__)

settings = get_settings()

# ── Groq client (OpenAI-compatible) ─────────────────────────────
client = AsyncOpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=settings.GROQ_API_KEY,
)


async def analyze_tos(tos_text: str, source_url: str | None = None) -> dict:
    """
    Send ToS text to Llama 3.3 70B on Groq and return structured analysis.

    Args:
        tos_text:   The raw Terms of Service text (max ~30 000 chars).
        source_url: Optional URL the ToS was scraped from.

    Returns:
        Parsed JSON dict matching the Blind-Sight response schema.
    """
    user_content = f"Analyze this Terms of Service:\n\n{tos_text}"
    if source_url:
        user_content = f"Source URL: {source_url}\n\n{user_content}"

    logger.info(
        "Sending ToS analysis request (%d chars) to %s",
        len(tos_text),
        settings.MODEL_NAME,
    )

    response = await client.chat.completions.create(
        model=settings.MODEL_NAME,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        response_format={"type": "json_object"},
        temperature=0.1,
        max_tokens=2000,
    )

    raw = response.choices[0].message.content
    logger.info("Received response (%d chars)", len(raw))

    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.error("Failed to parse LLM response as JSON: %s", exc)
        raise ValueError("LLM returned invalid JSON") from exc
