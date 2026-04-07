import json
import logging
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

ROADMAP_TTL = 3600  # 1 hour


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {settings.UPSTASH_REDIS_REST_TOKEN}",
        "Content-Type": "application/json",
    }


async def cache_get(key: str) -> dict | None:
    """Return the parsed JSON value for key, or None on miss / error."""
    if not settings.UPSTASH_REDIS_REST_URL or not settings.UPSTASH_REDIS_REST_TOKEN:
        return None
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                settings.UPSTASH_REDIS_REST_URL,
                headers=_headers(),
                json=["GET", key],
            )
            result = resp.json().get("result")
            if result is None:
                return None
            return json.loads(result)
    except Exception as exc:
        logger.warning("Redis GET error [key=%s]: %s", key, exc)
        return None


async def cache_set(key: str, value: dict, ttl: int = ROADMAP_TTL) -> None:
    """Serialize value to JSON and store in Redis with EX ttl (seconds)."""
    if not settings.UPSTASH_REDIS_REST_URL or not settings.UPSTASH_REDIS_REST_TOKEN:
        return
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                settings.UPSTASH_REDIS_REST_URL,
                headers=_headers(),
                json=["SET", key, json.dumps(value), "EX", ttl],
            )
    except Exception as exc:
        logger.warning("Redis SET error [key=%s]: %s", key, exc)
