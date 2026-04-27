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
