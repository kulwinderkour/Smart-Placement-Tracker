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
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://backend-api:8000"],
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
