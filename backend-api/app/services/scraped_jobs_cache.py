from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from app.schemas.scraped_job import ScrapedJob
from app.scrapers import scrape_all_sources

logger = logging.getLogger(__name__)

_cache_lock = asyncio.Lock()
_cached_jobs: list[ScrapedJob] = []
_last_updated: str | None = None
_last_query: str = "software developer"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _dedupe(jobs: list[ScrapedJob]) -> list[ScrapedJob]:
    seen: set[str] = set()
    out: list[ScrapedJob] = []
    for job in jobs:
        key = (job.applyUrl or "").strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(job)
    return out


async def refresh_cache(query: str | None = None) -> dict:
    global _cached_jobs, _last_updated, _last_query
    q = (query or _last_query or "software developer").strip()
    async with _cache_lock:
        jobs = await scrape_all_sources(q)
        _cached_jobs = _dedupe(jobs)
        _last_query = q
        _last_updated = _now_iso()
        logger.info("Scraped %s jobs for query='%s'", len(_cached_jobs), q)
    return {"jobs": _cached_jobs, "lastUpdated": _last_updated, "total": len(_cached_jobs)}


def _matches_type(job: ScrapedJob, t: str) -> bool:
    value = (job.employmentType or "").lower()
    text = f"{job.title} {job.description or ''} {job.location}".lower()
    if t in {"full-time", "fulltime"}:
        return "full-time" in value or "fulltime" in value or "full time" in text
    if t == "remote":
        return "remote" in value or "remote" in text
    return True


def get_cached_jobs(
    q: str | None = None,
    source: str | None = None,
    location: str | None = None,
    job_type: str | None = None,
) -> dict:
    query = (q or "").lower().strip()
    source_q = (source or "").lower().strip()
    location_q = (location or "").lower().strip()
    type_q = (job_type or "").lower().strip()

    filtered = [
        job
        for job in _cached_jobs
        if (
            not query
            or query in job.title.lower()
            or query in job.company.lower()
            or query in (job.location or "").lower()
        )
        and (not source_q or source_q == (job.source or "").lower())
        and (not location_q or location_q == "all" or location_q in (job.location or "").lower())
        and (not type_q or _matches_type(job, type_q))
    ]

    return {
        "jobs": [j.model_dump() for j in filtered],
        "lastUpdated": _last_updated,
        "total": len(filtered),
    }


async def scheduler_loop(interval_hours: int = 24):
    await refresh_cache()
    sleep_seconds = max(1, interval_hours * 3600)
    while True:
        await asyncio.sleep(sleep_seconds)
        try:
            await refresh_cache()
        except Exception as exc:
            logger.error("Scheduled scrape failed: %s", exc)
