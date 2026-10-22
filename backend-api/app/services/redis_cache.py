import json
import logging
import httpx
import redis.asyncio as aioredis
from app.config import settings

logger = logging.getLogger(__name__)

ROADMAP_TTL = 3600  # 1 hour

_redis_client: aioredis.Redis | None = None


def get_redis_client() -> aioredis.Redis | None:
    global _redis_client
    if _redis_client is None and settings.REDIS_URL:
        try:
            _redis_client = aioredis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_timeout=5.0,
            )
        except Exception as exc:
            logger.warning("Could not initialize Redis client: %s", exc)
    return _redis_client


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {settings.UPSTASH_REDIS_REST_TOKEN}",
        "Content-Type": "application/json",
    }


async def cache_get(key: str) -> dict | None:
    """Return the parsed JSON value for key from Redis, or None on miss / error."""
    # 1. Try standard Redis connection via REDIS_URL
    client = get_redis_client()
    if client:
        try:
            val = await client.get(key)
            if val is not None:
                return json.loads(val)
        except Exception as exc:
            logger.warning("[CACHE] Redis GET error key=%s: %s", key, exc)

    # 2. Fallback to Upstash REST if configured
    if settings.UPSTASH_REDIS_REST_URL and settings.UPSTASH_REDIS_REST_TOKEN:
        try:
            async with httpx.AsyncClient(timeout=10.0) as http_client:
                resp = await http_client.post(
                    settings.UPSTASH_REDIS_REST_URL,
                    headers=_headers(),
                    json=["GET", key],
                )
                if resp.status_code == 200:
                    result = resp.json().get("result")
                    if result is not None:
                        return json.loads(result)
        except Exception as exc:
            logger.error("[CACHE] Upstash GET exception key=%s: %s", key, exc)

    return None


async def cache_set(key: str, value: dict, ttl: int = ROADMAP_TTL) -> None:
    """Serialize value to JSON and store in Redis with EX ttl (seconds)."""
    serialized = json.dumps(value)

    # 1. Try standard Redis connection via REDIS_URL
    client = get_redis_client()
    if client:
        try:
            await client.set(key, serialized, ex=ttl)
            return
        except Exception as exc:
            logger.warning("[CACHE] Redis SET error key=%s: %s", key, exc)

    # 2. Fallback to Upstash REST if configured
    if settings.UPSTASH_REDIS_REST_URL and settings.UPSTASH_REDIS_REST_TOKEN:
        try:
            async with httpx.AsyncClient(timeout=10.0) as http_client:
                await http_client.post(
                    settings.UPSTASH_REDIS_REST_URL,
                    headers=_headers(),
                    json=["SET", key, serialized, "EX", ttl],
                )
        except Exception as exc:
            logger.error("[CACHE] Upstash SET exception key=%s: %s", key, exc)
