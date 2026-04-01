import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, jobs, applications, admin, company, roadmap, questions
from app.routers.agent_internal import router as agent_internal_router
from app.routers.google_auth import router as google_router
from app.routers.company_jobs import router as company_jobs_router
from app.routers.student_api import router as student_api_router
from app.services.realtime import redis_subscriber

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(redis_subscriber())
    logger.info("Redis subscriber background task started.")
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        logger.info("Redis subscriber stopped.")


app = FastAPI(
    title="Smart Placement Tracker API",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
app.include_router(roadmap.router,     prefix="/api/v1")
app.include_router(questions.router,   prefix="/api/v1")
app.include_router(agent_internal_router, prefix="/api/v1")

@app.get("/health")
def health():
    return {"status": "ok", "service": "backend-api"}
