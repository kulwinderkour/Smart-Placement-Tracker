import os

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.application import Application
from app.models.job import Job
from app.models.student import Student
from app.models.user import User, UserRole

router = APIRouter(prefix="/admin", tags=["admin"])

COLLECTOR_URL = os.getenv("COLLECTOR_URL", "http://collector:8001")


def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    total_jobs = await db.scalar(select(func.count()).select_from(Job))
    active_jobs = await db.scalar(
        select(func.count()).select_from(Job).where(Job.is_active == True)
    )
    total_students = await db.scalar(select(func.count()).select_from(Student))
    total_applications = await db.scalar(select(func.count()).select_from(Application))

    return {
        "total_jobs": total_jobs,
        "active_jobs": active_jobs,
        "total_students": total_students,
        "total_applications": total_applications,
    }


@router.post("/trigger-scrape")
async def trigger_scrape(_: User = Depends(require_admin)):
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{COLLECTOR_URL}/health")
            if response.status_code == 200:
                return {"message": "Collector is running. Next scrape will run on schedule."}
    except httpx.RequestError:
        raise HTTPException(status_code=503, detail="Collector service unreachable")
