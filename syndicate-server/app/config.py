"""
Syndicate Server — Configuration
Loads settings from environment variables / .env file.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    MEGALLM_API_KEY: str = ""
    MODEL_NAME: str = "llama3.3-70b-instruct"

    ALLOWED_API_KEYS: str = ""

    PORT: int = 8000
    RATE_LIMIT: str = "10/minute"

    APP_VERSION: str = "1.0.0"
    APP_TITLE: str = "Syndicate Server"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    @property
    def allowed_keys_list(self) -> list[str]:
        """Parse the comma-separated ALLOWED_API_KEYS into a list."""
        if not self.ALLOWED_API_KEYS:
            return []
        return [k.strip() for k in self.ALLOWED_API_KEYS.split(",") if k.strip()]

@lru_cache()
def get_settings() -> Settings:
    """Return a cached Settings singleton."""
    return Settings()
