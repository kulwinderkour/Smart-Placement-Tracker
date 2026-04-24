import json
import logging
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

ROADMAP_TTL = 3600  # 1 hour


def _headers() -> dict:
    if not settings.UPSTASH_REDIS_REST_TOKEN:
        raise RuntimeError("[REDIS] UPSTASH_REDIS_REST_TOKEN is not set")
    if not settings.UPSTASH_REDIS_REST_URL:
        raise RuntimeError("[REDIS] UPSTASH_REDIS_REST_URL is not set")
    return {
        "Authorization": f"Bearer {settings.UPSTASH_REDIS_REST_TOKEN}",
        "Content-Type": "application/json",
    }


async def cache_get(key: str) -> dict | None:
    """Return the parsed JSON value for key, or None on miss / error."""
    print(f"[CACHE] GET key={key}")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                settings.UPSTASH_REDIS_REST_URL,
                headers=_headers(),
                json=["GET", key],
            )
            print(f"[CACHE] GET status={resp.status_code} body={resp.text[:200]}")
            if resp.status_code != 200:
                logger.error("[CACHE] GET failed status=%s body=%s", resp.status_code, resp.text[:300])
                return None
            result = resp.json().get("result")
            if result is None:
                print(f"[CACHE] MISS key={key}")
                return None
            print(f"[CACHE] HIT key={key}")
            return json.loads(result)
    except Exception as exc:
        logger.error("[CACHE] GET exception key=%s error=%s", key, exc)
        return None


async def cache_set(key: str, value: dict, ttl: int = ROADMAP_TTL) -> None:
    """Serialize value to JSON and store in Redis with EX ttl (seconds)."""
    print(f"[CACHE] SET key={key} ttl={ttl}")
    try:
        serialized = json.dumps(value)
        print(f"[CACHE] SET payload_size={len(serialized)} bytes")
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                settings.UPSTASH_REDIS_REST_URL,
                headers=_headers(),
                json=["SET", key, serialized, "EX", ttl],
            )
            print(f"[CACHE] SET status={resp.status_code} body={resp.text[:200]}")
            if resp.status_code != 200:
                logger.error("[CACHE] SET failed status=%s body=%s", resp.status_code, resp.text[:300])
            else:
                print(f"[CACHE] SET success key={key}")
    except Exception as exc:
        logger.error("[CACHE] SET exception key=%s error=%s", key, exc)
