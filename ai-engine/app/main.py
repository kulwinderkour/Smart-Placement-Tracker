from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import agent, internal, interview, recommend, resume, skill_gap
from app.routes.matcher_routes import router as matcher_router
from app.routes.agent_routes import router as agent_auto_apply_router
app = FastAPI(
    title="Student Placement Tracker — AI Engine",
    version="1.0.0",
    docs_url="/docs",
)

app.add_middleware(
    CORSMiddleware,
    # Allow both localhost and 127.0.0.1 on any dev port (3000, 5173, etc.)
    # because the browser's Origin must match exactly or fetch() fails.
    allow_origin_regex=r"^(http://(localhost|127\.0\.0\.1)(:\d+)?|https://smart-placement-pro\.web\.app|https://smart-placement-pro\.firebaseapp\.com)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resume.router)
app.include_router(recommend.router)
app.include_router(skill_gap.router)
app.include_router(interview.router)
app.include_router(internal.router)
app.include_router(agent.router)
app.include_router(matcher_router, prefix="/api/matcher", tags=["matcher"])
app.include_router(agent_auto_apply_router, prefix="/api/agent", tags=["agent"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-engine"}
