import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.services.redis_cache import cache_get, cache_set
from app.routers import auth, jobs, applications, admin, company, roadmap, questions
from app.routers.agent_internal import router as agent_internal_router
from app.routers.agent_logs import router as agent_logs_router
from app.routers.google_auth import router as google_router
from app.routers.company_jobs import router as company_jobs_router
from app.routers.student_api import router as student_api_router
from app.routers.scraped_jobs import router as scraped_jobs_router
from app.services.realtime import redis_subscriber
from app.services.scraped_jobs_cache import scheduler_loop

logger = logging.getLogger(__name__)


def _build_allowed_origins() -> list[str]:
    frontend_url = os.environ.get("FRONTEND_URL", "").strip().rstrip("/")
    frontend_urls = os.environ.get("FRONTEND_URLS", "")
    configured = [origin.strip().rstrip("/") for origin in frontend_urls.split(",") if origin.strip()]

    local_defaults = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]

    if frontend_url:
        configured.append(frontend_url)

    # Deduplicate while preserving order.
    return list(dict.fromkeys(configured + local_defaults))


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(redis_subscriber())
    scraper_task = asyncio.create_task(scheduler_loop(interval_hours=24))
    logger.info("Redis subscriber background task started.")
    yield
    task.cancel()
    scraper_task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        logger.info("Redis subscriber stopped.")
    try:
        await scraper_task
    except asyncio.CancelledError:
        logger.info("Scraper scheduler stopped.")


app = FastAPI(
    title="Smart Placement Tracker API",
    version="2.0.0",
    lifespan=lifespan,
)

_allowed_origins = _build_allowed_origins()
if not os.environ.get("FRONTEND_URL") and not os.environ.get("FRONTEND_URLS"):
    logger.warning("FRONTEND_URL/FRONTEND_URLS not set; using localhost-only CORS defaults.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,        prefix="/api/v1")
app.include_router(jobs.router,        prefix="/api/v1")
app.include_router(applications.router,prefix="/api/v1")
app.include_router(admin.router,       prefix="/api/v1")
app.include_router(google_router,      prefix="/api/v1")
app.include_router(company.router,     prefix="/api/v1")
app.include_router(company_jobs_router,prefix="/api/v1")
app.include_router(student_api_router, prefix="/api/v1")
app.include_router(scraped_jobs_router, prefix="/api/v1")
app.include_router(roadmap.router,     prefix="/api/v1")
app.include_router(questions.router,   prefix="/api/v1")
app.include_router(agent_internal_router, prefix="/api/v1")
app.include_router(agent_logs_router,    prefix="/api/v1")

@app.get("/health")
def health():
    return {"status": "ok", "service": "backend-api"}


@app.get("/debug/all-keys")
async def all_redis_keys():
    """Return every key currently in Redis (KEYS *)."""
    import httpx
    from app.config import settings
    if not settings.UPSTASH_REDIS_REST_URL or not settings.UPSTASH_REDIS_REST_TOKEN:
        return {"error": "Upstash env vars not set"}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                settings.UPSTASH_REDIS_REST_URL,
                headers={
                    "Authorization": f"Bearer {settings.UPSTASH_REDIS_REST_TOKEN}",
                    "Content-Type": "application/json",
                },
                json=["KEYS", "*"],
            )
            print(f"[DEBUG/all-keys] status={resp.status_code} body={resp.text[:500]}")
            return {"status": resp.status_code, "keys": resp.json().get("result", [])}
    except Exception as e:
        return {"error": str(e)}


@app.get("/debug/redis-test")
async def redis_test():
    """Debug endpoint: SET then GET a test key and return the result."""
    from app.config import settings
    test_key = "debug:redis-test"
    test_val = {"msg": "hello from smartplacement", "ts": "check"}
    errors = []

    if not settings.UPSTASH_REDIS_REST_URL:
        return {"error": "UPSTASH_REDIS_REST_URL not set"}
    if not settings.UPSTASH_REDIS_REST_TOKEN:
        return {"error": "UPSTASH_REDIS_REST_TOKEN not set"}

    try:
        await cache_set(test_key, test_val, ttl=300)
    except Exception as e:
        errors.append(f"SET error: {e}")

    retrieved = None
    try:
        retrieved = await cache_get(test_key)
    except Exception as e:
        errors.append(f"GET error: {e}")

    return {
        "upstash_url": settings.UPSTASH_REDIS_REST_URL,
        "token_prefix": settings.UPSTASH_REDIS_REST_TOKEN[:12] + "...",
        "set_value": test_val,
        "get_result": retrieved,
        "match": retrieved == test_val,
        "errors": errors,
    }
