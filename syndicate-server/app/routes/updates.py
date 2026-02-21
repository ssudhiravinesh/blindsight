from typing import Dict
from fastapi import APIRouter

router = APIRouter()

# Mock database of the "Latest ToS Versions" for popular websites.
# Mock dataset of terms of service versions
# In a real application, this would be a database queried by background workers.
MOCK_TOS_LATEST_VERSIONS = {
    "facebook.com": {"version": "v2024.11", "url": "https://raw.githubusercontent.com/microsoft/TypeScript/main/README.md"}, 
    "twitter.com": {"version": "v2024.10", "url": "https://raw.githubusercontent.com/microsoft/TypeScript/main/README.md"},
    "amazon.com": {"version": "v2024.12", "url": "https://raw.githubusercontent.com/microsoft/TypeScript/main/README.md"},
    "google.com": {"version": "v2024.05", "url": "https://raw.githubusercontent.com/microsoft/TypeScript/main/README.md"},
    "netflix.com": {"version": "v2024.01", "url": "https://raw.githubusercontent.com/microsoft/TypeScript/main/README.md"}
}

@router.get("/updates", response_model=Dict[str, Dict[str, str]], summary="Get latest ToS versions")
async def get_latest_tos_versions():
    """
    Returns a dictionary mapping popular domains to their latest known Terms of Service version strings and raw URLs.
    The Chrome extension uses this to check if a user's locally accepted ToS is out of date and fetch the new text.
    """
    return MOCK_TOS_LATEST_VERSIONS

@router.get("/version", response_model=Dict[str, str], summary="Get specific ToS version")
async def get_tos_version(domain: str):
    """
    Returns the current ToS version for a specific domain.
    If the domain is not in the mock list, returns a generic fallback version.
    """
    import datetime
    # Use the mock data if present, else a generic default based on the current month/year
    # e.g., "v2024.10"
    now = datetime.datetime.now()
    default_version = f"v{now.year}.{now.month:02d}"
    
    version_data = MOCK_TOS_LATEST_VERSIONS.get(domain.lower(), {})
    version = version_data.get("version", default_version)
    return {"domain": domain, "version": version}
