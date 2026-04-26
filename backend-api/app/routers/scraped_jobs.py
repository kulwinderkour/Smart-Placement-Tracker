from fastapi import APIRouter, Query

from app.services.scraped_jobs_cache import get_cached_jobs, refresh_cache

router = APIRouter(prefix="/scraped-jobs", tags=["scraped-jobs"])


@router.get("", response_model=dict)
async def list_scraped_jobs(
    q: str | None = Query(default=None),
    source: str | None = Query(default=None),
    location: str | None = Query(default=None),
    type: str | None = Query(default=None),
):
    return get_cached_jobs(q=q, source=source, location=location, job_type=type)


@router.post("/refresh", response_model=dict)
async def refresh_scraped_jobs(q: str | None = Query(default=None)):
    return await refresh_cache(query=q)
