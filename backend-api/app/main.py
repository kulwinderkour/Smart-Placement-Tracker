import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.services.redis_cache import cache_get, cache_set
from app.routers import auth, jobs, applications, admin, company, roadmap, questions, skills
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
        "http://localhost:3001",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:5173",
    ]

    if frontend_url:
        configured.append(frontend_url)

    # Deduplicate while preserving order.
    return list(dict.fromkeys(configured + local_defaults))


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-initialize database tables and seed baseline data
    try:
        from app.database import Base, engine, AsyncSessionLocal
        from app.models import User, Student, Job
        from app.models.user import UserRole
        from app.utils.security import hash_password
        import uuid
        from datetime import datetime, timezone, timedelta
        from sqlalchemy import select

        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database schema verified/created successfully.")

        async with AsyncSessionLocal() as session:
            admin_check = await session.execute(select(User).where(User.email == "abhishek@gmail.com"))
            admin_user = admin_check.scalar_one_or_none()
            if not admin_user:
                admin_id = uuid.uuid4()
                admin_user = User(
                    id=admin_id,
                    email="abhishek@gmail.com",
                    password_hash=hash_password("Abhi1212"),
                    role=UserRole.admin,
                    is_onboarding_completed=True,
                )
                session.add(admin_user)
            else:
                admin_id = admin_user.id

            # Ensure verified company profile for admin
            from app.models.company_profile import CompanyProfile
            cp_check = await session.execute(select(CompanyProfile).where(CompanyProfile.user_id == admin_id))
            cp = cp_check.scalar_one_or_none()
            if not cp:
                cp = CompanyProfile(
                    id=uuid.uuid4(),
                    user_id=admin_id,
                    company_name="SmartPlacement Technologies",
                    website="https://smart-placement-trackerr.web.app",
                    industry_type="Technology",
                    location="Bangalore, India",
                    company_size="51-200",
                    description="AI-driven placement and recruitment platform.",
                    is_draft=False,
                )
                session.add(cp)
                await session.flush()

            student_check = await session.execute(select(User).where(User.email == "student@gmail.com"))
            if not student_check.scalar_one_or_none():
                s_id = uuid.uuid4()
                session.add(User(
                    id=s_id,
                    email="student@gmail.com",
                    password_hash=hash_password("Student123!"),
                    role=UserRole.student,
                    is_onboarding_completed=True,
                ))
                session.add(Student(
                    id=uuid.uuid4(),
                    user_id=s_id,
                    full_name="Demo Student",
                ))

            jobs_check = await session.execute(select(Job))
            if not jobs_check.scalars().first():
                session.add_all([
                    Job(
                        id=uuid.uuid4(),
                        company_profile_id=cp.id,
                        source_url="https://careers.google.com/jobs/1",
                        source_hash="hash_google_1",
                        company_name="Google",
                        role_title="Software Engineer II",
                        location="Bangalore, India",
                        salary_min=2500000,
                        salary_max=4000000,
                        experience_min=2,
                        experience_max=5,
                        job_type="full_time",
                        description="Develop scalable cloud systems and APIs.",
                        deadline=datetime.now(timezone.utc) + timedelta(days=30),
                        is_active=True,
                        collected_at=datetime.now(timezone.utc),
                        processed_at=datetime.now(timezone.utc),
                    ),
                    Job(
                        id=uuid.uuid4(),
                        company_profile_id=cp.id,
                        source_url="https://careers.microsoft.com/jobs/1",
                        source_hash="hash_microsoft_1",
                        company_name="Microsoft",
                        role_title="Data Scientist",
                        location="Hyderabad, India",
                        salary_min=1800000,
                        salary_max=3000000,
                        experience_min=1,
                        experience_max=4,
                        job_type="full_time",
                        description="Machine learning and LLM engineering.",
                        deadline=datetime.now(timezone.utc) + timedelta(days=30),
                        is_active=True,
                        collected_at=datetime.now(timezone.utc),
                        processed_at=datetime.now(timezone.utc),
                    ),
                ])

            await session.commit()
            logger.info("Default seed data initialized successfully.")
    except Exception as exc:
        logger.warning("Database startup init warning: %s", exc)

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
app.include_router(skills.router,        prefix="/api/v1")
app.include_router(skills.router,        prefix="/api")

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
