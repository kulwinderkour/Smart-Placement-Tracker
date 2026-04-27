import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import agent, internal, recommend, resume, skill_gap
from app.routes.matcher_routes import router as matcher_router
from app.routes.agent_routes import router as agent_auto_apply_router


def _parse_frontend_origins() -> list[str]:
    raw = os.getenv("FRONTEND_URLS", "")
    origins = [origin.strip().rstrip("/") for origin in raw.split(",") if origin.strip()]
    default_local = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]
    # Deduplicate while preserving order.
    return list(dict.fromkeys(origins + default_local))


app = FastAPI(
    title="Student Placement Tracker — AI Engine",
    version="1.0.0",
    docs_url="/docs",
)

app.add_middleware(
    CORSMiddleware,
    # Allow configured frontend origins, with localhost fallback for development.
    allow_origins=_parse_frontend_origins(),
    # Keep regex for local dev ports not listed explicitly.
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resume.router)
app.include_router(recommend.router)
app.include_router(skill_gap.router)
app.include_router(internal.router)
app.include_router(agent.router)
app.include_router(matcher_router, prefix="/api/matcher", tags=["matcher"])
app.include_router(agent_auto_apply_router, prefix="/api/agent", tags=["agent"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-engine"}


@app.get("/model/health")
def model_health():
    from app.services.profile_matcher_service import _load_matcher_artifact
    a = _load_matcher_artifact()
    loaded = a.get("model_loaded", False)
    return {
        "status": "ok" if loaded else "degraded",
        "model_loaded": loaded,
        "version": a.get("version", "unknown"),
        "training_samples": a.get("training_samples"),
        "mode": "ml_model" if loaded else "rule_based_fallback",
    }


@app.get("/redis/health")
async def redis_health():
    import time
    from app.core.session_store import _get_redis
    try:
        r = await _get_redis()
        if r:
            ts = str(time.time())
            await r.set("health:ping", ts, ex=10)
            val = await r.get("health:ping")
            return {"status": "ok", "redis": "connected", "roundtrip": val == ts}
        return {"status": "degraded", "redis": "unavailable", "using": "in-process-fallback"}
    except Exception as e:
        return {"status": "error", "redis": "error", "detail": str(e)}


@app.get("/db/health")
async def db_health():
    import httpx
    from app.config import settings
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"{settings.BACKEND_URL}/health")
            return {"status": "ok" if r.status_code == 200 else "error", "backend_reachable": r.status_code == 200}
    except Exception as e:
        return {"status": "error", "backend_reachable": False, "detail": str(e)}
