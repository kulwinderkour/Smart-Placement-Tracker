import os
import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.application import Application
from app.models.company_profile import CompanyProfile
from app.models.job import Job
from app.models.student import Student
from app.models.user import User, UserRole
from app.schemas.admin import (
    AdminCompanySummary,
    AdminRecentApplication,
    AdminRecentJob,
    AdminStatsResponse,
    CompanyGrowthItem,
    IndustryDistributionItem,
)
from app.schemas.job import JobResponse
from app.schemas.student import StudentResponse
from pydantic import BaseModel

router = APIRouter(prefix="/admin", tags=["admin"])

class JobStatusUpdate(BaseModel):
    is_active: bool

COLLECTOR_URL = os.getenv("COLLECTOR_URL", "http://collector:8001")


def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.get("/stats")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> AdminStatsResponse:
    total_jobs = await db.scalar(select(func.count()).select_from(Job))
    total_students = await db.scalar(select(func.count()).select_from(Student))
    total_applications = await db.scalar(select(func.count()).select_from(Application))
    total_companies = await db.scalar(
        select(func.count()).select_from(CompanyProfile).where(CompanyProfile.is_draft == False)
    )

    recent_companies_result = await db.execute(
        select(CompanyProfile)
        .where(CompanyProfile.is_draft == False)
        .order_by(CompanyProfile.created_at.desc())
        .limit(5)
    )
    recent_companies = recent_companies_result.scalars().all()

    recent_jobs_result = await db.execute(
        select(Job)
        .order_by(Job.created_at.desc())
        .limit(5)
    )
    recent_jobs_models = recent_jobs_result.scalars().all()

    recent_apps_result = await db.execute(
        select(Application, Student.full_name, Job.company_name, Job.role_title)
        .join(Student, Student.id == Application.student_id)
        .join(Job, Job.id == Application.job_id)
        .order_by(Application.applied_at.desc())
        .limit(5)
    )

    industry_result = await db.execute(
        select(
            func.coalesce(CompanyProfile.industry_type, "unknown").label("industry_type"),
            func.count(CompanyProfile.id).label("count"),
        )
        .where(CompanyProfile.is_draft == False)
        .group_by(func.coalesce(CompanyProfile.industry_type, "unknown"))
        .order_by(func.count(CompanyProfile.id).desc())
    )

    growth_result = await db.execute(
        select(
            func.date_trunc("month", CompanyProfile.created_at).label("month"),
            func.count(CompanyProfile.id).label("count"),
        )
        .where(CompanyProfile.is_draft == False)
        .group_by(func.date_trunc("month", CompanyProfile.created_at))
        .order_by(func.date_trunc("month", CompanyProfile.created_at).asc())
    )

    recent_applications = [
        AdminRecentApplication(
            id=application.id,
            student_name=student_name,
            company_name=company_name,
            role_title=role_title,
            status=application.status.value,
            applied_at=application.applied_at,
        )
        for application, student_name, company_name, role_title in recent_apps_result.all()
    ]

    industry_distribution = [
        IndustryDistributionItem(industry_type=row.industry_type, count=row.count)
        for row in industry_result.all()
    ]

    company_growth = [
        CompanyGrowthItem(month=row.month.strftime("%Y-%m"), count=row.count)
        for row in growth_result.all()
    ]

    return AdminStatsResponse(
        total_students=total_students or 0,
        total_companies=total_companies or 0,
        total_jobs=total_jobs or 0,
        total_applications=total_applications or 0,
        recent_companies=[AdminCompanySummary.model_validate(company) for company in recent_companies],
        recent_jobs=[
            AdminRecentJob(
                id=job.id,
                company_name=job.company_name,
                role_title=job.role_title,
                is_active=job.is_active,
                created_at=job.created_at,
            )
            for job in recent_jobs_models
        ],
        recent_applications=recent_applications,
        industry_distribution=industry_distribution,
        company_growth=company_growth,
    )


@router.get("/companies", response_model=dict)
async def list_companies(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = select(CompanyProfile).where(CompanyProfile.is_draft == False)
    if search:
        query = query.where(CompanyProfile.company_name.ilike(f"%{search}%"))

    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    result = await db.execute(
        query.order_by(CompanyProfile.created_at.desc()).offset((page - 1) * limit).limit(limit)
    )
    companies = result.scalars().all()

    return {
        "success": True,
        "data": [AdminCompanySummary.model_validate(company) for company in companies],
        "meta": {"page": page, "limit": limit, "total": total},
    }


@router.get("/companies/{company_id}", response_model=AdminCompanySummary)
async def get_company_detail(
    company_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    company = await db.get(CompanyProfile, company_id)
    if not company or company.is_draft:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.post("/trigger-scrape")
async def trigger_scrape(_: User = Depends(require_admin)):
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{COLLECTOR_URL}/health")
            if response.status_code == 200:
                return {"message": "Collector is running. Next scrape will run on schedule."}
    except httpx.RequestError:
        raise HTTPException(status_code=503, detail="Collector service unreachable")


@router.get("/students", response_model=dict)
async def list_students(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = select(Student)
    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    result = await db.execute(query.offset((page - 1) * limit).limit(limit))
    students = result.scalars().all()

    return {
        "success": True,
        "data": [StudentResponse.model_validate(s) for s in students],
        "meta": {"page": page, "limit": limit, "total": total},
    }


@router.get("/jobs", response_model=dict)
async def list_all_jobs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = select(Job)
    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    result = await db.execute(query.offset((page - 1) * limit).limit(limit))
    jobs = result.scalars().all()

    return {
        "success": True,
        "data": [JobResponse.model_validate(j) for j in jobs],
        "meta": {"page": page, "limit": limit, "total": total},
    }


@router.patch("/jobs/{job_id}/status", response_model=JobResponse)
async def update_job_status(
    job_id: uuid.UUID,
    data: JobStatusUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job.is_active = data.is_active
    await db.commit()
    await db.refresh(job)
    return job
