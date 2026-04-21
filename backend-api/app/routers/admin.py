import os
import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from app.services import storage_service
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.application import Application, ApplicationStatus
from app.models.company_profile import CompanyProfile
from app.models.interview import Interview, InterviewMode, InterviewStatus
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
from typing import Optional
from datetime import datetime

router = APIRouter(prefix="/admin", tags=["admin"])

class JobStatusUpdate(BaseModel):
    is_active: bool

class InviteStudentRequest(BaseModel):
    student_id: uuid.UUID
    job_id: str
    message: Optional[str] = None

class ApplicationStatusUpdate(BaseModel):
    status: str

class InterviewCreate(BaseModel):
    student_id: uuid.UUID
    job_id: uuid.UUID
    scheduled_at: datetime
    mode: InterviewMode = InterviewMode.google_meet
    meeting_link: Optional[str] = None
    notes: Optional[str] = None

class InterviewUpdate(BaseModel):
    scheduled_at: Optional[datetime] = None
    mode: Optional[InterviewMode] = None
    meeting_link: Optional[str] = None
    status: Optional[InterviewStatus] = None
    notes: Optional[str] = None
    feedback_rating: Optional[int] = None
    feedback_comment: Optional[str] = None

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


# ─── APPLICANTS ──────────────────────────────────────────────────────────────

@router.get("/applicants", response_model=dict)
async def list_applicants(
    job_id: uuid.UUID | None = Query(default=None),
    status: str | None = Query(default=None),
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = (
        select(
            Application.id,
            Application.student_id,
            Application.job_id,
            Application.status,
            Application.applied_at,
            Application.notes,
            Application.cover_letter,
            Application.agent_applied,
            Student.full_name.label("student_name"),
            Student.college,
            Student.branch,
            Student.graduation_year,
            Student.cgpa,
            Student.resume_url,
            Student.linkedin_url,
            Job.role_title,
            Job.company_name,
        )
        .join(Student, Student.id == Application.student_id)
        .join(Job, Job.id == Application.job_id)
    )
    if job_id:
        query = query.where(Application.job_id == job_id)
    if status:
        try:
            query = query.where(Application.status == ApplicationStatus(status))
        except ValueError:
            pass

    total = await db.scalar(select(func.count()).select_from(
        select(Application.id).join(Student, Student.id == Application.student_id).join(Job, Job.id == Application.job_id).where(*([Application.job_id == job_id] if job_id else [])).subquery()
    ))
    result = await db.execute(query.order_by(Application.applied_at.desc()).offset((page - 1) * limit).limit(limit))
    rows = result.mappings().all()

    data = [
        {
            "id": str(r["id"]),
            "student_id": str(r["student_id"]),
            "job_id": str(r["job_id"]),
            "student_name": r["student_name"],
            "college": r["college"],
            "branch": r["branch"],
            "graduation_year": r["graduation_year"],
            "cgpa": float(r["cgpa"]) if r["cgpa"] else None,
            "resume_url": r["resume_url"],
            "linkedin_url": r["linkedin_url"],
            "role_title": r["role_title"],
            "company_name": r["company_name"],
            "status": r["status"].value if hasattr(r["status"], "value") else r["status"],
            "applied_at": r["applied_at"].isoformat(),
            "notes": r["notes"],
            "cover_letter": r["cover_letter"],
            "agent_applied": r["agent_applied"],
        }
        for r in rows
    ]
    return {"success": True, "data": data, "meta": {"page": page, "limit": limit, "total": total or 0}}


@router.patch("/applicants/{application_id}/status")
async def update_application_status(
    application_id: uuid.UUID,
    data: ApplicationStatusUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    app = await db.get(Application, application_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    try:
        app.status = ApplicationStatus(data.status)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid status: {data.status}")
    await db.commit()
    await db.refresh(app)
    return {"id": str(app.id), "status": app.status.value}


# ─── INTERVIEWS ──────────────────────────────────────────────────────────────

@router.get("/interviews", response_model=dict)
async def list_interviews(
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(
        select(
            Interview.id,
            Interview.student_id,
            Interview.job_id,
            Interview.scheduled_at,
            Interview.mode,
            Interview.meeting_link,
            Interview.status,
            Interview.notes,
            Interview.feedback_rating,
            Interview.feedback_comment,
            Interview.created_at,
            Student.full_name.label("student_name"),
            Job.role_title,
        )
        .join(Student, Student.id == Interview.student_id)
        .join(Job, Job.id == Interview.job_id)
        .order_by(Interview.scheduled_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    rows = result.mappings().all()
    data = [
        {
            "id": str(r["id"]),
            "student_id": str(r["student_id"]),
            "job_id": str(r["job_id"]),
            "student_name": r["student_name"],
            "role_title": r["role_title"],
            "scheduled_at": r["scheduled_at"].isoformat(),
            "mode": r["mode"].value if hasattr(r["mode"], "value") else r["mode"],
            "meeting_link": r["meeting_link"],
            "status": r["status"].value if hasattr(r["status"], "value") else r["status"],
            "notes": r["notes"],
            "feedback_rating": r["feedback_rating"],
            "feedback_comment": r["feedback_comment"],
            "created_at": r["created_at"].isoformat(),
        }
        for r in rows
    ]
    total = await db.scalar(select(func.count()).select_from(Interview))
    return {"success": True, "data": data, "meta": {"page": page, "limit": limit, "total": total or 0}}


@router.post("/interviews", status_code=201)
async def create_interview(
    data: InterviewCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    interview = Interview(
        id=uuid.uuid4(),
        student_id=data.student_id,
        job_id=data.job_id,
        scheduled_at=data.scheduled_at,
        mode=data.mode,
        meeting_link=data.meeting_link,
        notes=data.notes,
    )
    db.add(interview)
    await db.commit()
    await db.refresh(interview)
    return {"id": str(interview.id), "status": interview.status.value}


@router.patch("/interviews/{interview_id}")
async def update_interview(
    interview_id: uuid.UUID,
    data: InterviewUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    interview = await db.get(Interview, interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(interview, field, value)
    await db.commit()
    await db.refresh(interview)
    return {"id": str(interview.id), "status": interview.status.value}


# ─── ANALYTICS ───────────────────────────────────────────────────────────────

@router.get("/analytics")
async def get_analytics(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    # Applications over time (last 30 days by day)
    apps_over_time_result = await db.execute(
        select(
            func.date_trunc("day", Application.applied_at).label("date"),
            func.count(Application.id).label("count"),
        )
        .group_by(func.date_trunc("day", Application.applied_at))
        .order_by(func.date_trunc("day", Application.applied_at).asc())
        .limit(30)
    )

    # Placement funnel by status
    funnel_result = await db.execute(
        select(
            Application.status.label("status"),
            func.count(Application.id).label("count"),
        )
        .group_by(Application.status)
        .order_by(func.count(Application.id).desc())
    )

    # Top colleges by application count
    colleges_result = await db.execute(
        select(
            func.coalesce(Student.college, "Unknown").label("college"),
            func.count(Application.id).label("count"),
        )
        .join(Application, Application.student_id == Student.id)
        .group_by(func.coalesce(Student.college, "Unknown"))
        .order_by(func.count(Application.id).desc())
        .limit(10)
    )

    total_apps = await db.scalar(select(func.count()).select_from(Application)) or 0
    offer_count = await db.scalar(
        select(func.count()).select_from(Application).where(Application.status == ApplicationStatus.offer)
    ) or 0
    hr_count = await db.scalar(
        select(func.count()).select_from(Application).where(
            Application.status.in_([ApplicationStatus.hr_round, ApplicationStatus.offer])
        )
    ) or 0

    return {
        "applications_over_time": [
            {"date": row.date.strftime("%Y-%m-%d"), "count": row.count}
            for row in apps_over_time_result.all()
        ],
        "placement_funnel": [
            {"status": row.status.value if hasattr(row.status, "value") else row.status, "count": row.count}
            for row in funnel_result.all()
        ],
        "top_colleges": [
            {"college": row.college, "count": row.count}
            for row in colleges_result.all()
        ],
        "offer_rate": round((offer_count / total_apps * 100), 1) if total_apps > 0 else 0,
        "shortlist_rate": round((hr_count / total_apps * 100), 1) if total_apps > 0 else 0,
    }


@router.get("/analytics/summary")
async def get_analytics_summary(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """
    Lightweight analytics summary for the top stat cards.
    Pure SQL counts from the database.
    """
    active_jobs = await db.scalar(
        select(func.count()).select_from(Job).where(Job.is_active == True)  # noqa: E712
    ) or 0

    total_applicants = await db.scalar(
        select(func.count(func.distinct(Application.student_id))).select_from(Application)
    ) or 0

    shortlisted = await db.scalar(
        select(func.count())
        .select_from(Application)
        .where(
            Application.status.in_(
                [
                    ApplicationStatus.technical_round,  # "Interviewed"
                    ApplicationStatus.hr_round,
                    ApplicationStatus.offer,
                ]
            )
        )
    ) or 0

    offers_made = await db.scalar(
        select(func.count())
        .select_from(Application)
        .where(Application.status == ApplicationStatus.offer)
    ) or 0

    denom = total_applicants if total_applicants > 0 else 1
    offer_rate = round((offers_made / denom) * 100)

    return {
        "activeJobs": int(active_jobs),
        "totalApplicants": int(total_applicants),
        "shortlisted": int(shortlisted),
        "offersMade": int(offers_made),
        "offerRate": int(offer_rate),
    }


@router.get("/students/{student_id}/resume")
async def get_student_resume(
    student_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """
    Generate a 15-minute signed URL for admin to download a student's resume.

    The file is fetched directly from Google Cloud Storage by the browser.
    This endpoint never proxies the file bytes — it only generates and
    returns the signed URL.

    Access control:
      - Admin JWT required (require_admin dependency)
      - Signed URL expires in 15 minutes
      - URL is single-use in practice (browser fetches it once)
    """
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    if not student.resume_url:
        raise HTTPException(status_code=404, detail="This student has not uploaded a resume.")

    try:
        signed_url = storage_service.generate_signed_url(student.resume_url, expiry_minutes=15)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    return {
        "signed_url": signed_url,
        "resume_name": student.resume_name,
        "student_name": student.full_name,
        "expires_in_minutes": 15,
    }


@router.post("/invite-student")
async def invite_student(
    payload: InviteStudentRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(Student).where(Student.id == payload.student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return {
        "success": True,
        "message": f"Invitation sent to {student.full_name}",
        "student_id": str(payload.student_id),
        "job_id": payload.job_id,
    }
