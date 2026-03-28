"""Student-facing public API.

IMPORTANT: This router is PREPARED for the student dashboard team.
           Do NOT connect these endpoints to the admin/company dashboard.

All active jobs from ALL companies are visible here — this is by design.
Students browse across companies; companies operate in isolation from each other.

Endpoints:
  GET  /student/jobs              all active jobs (search + filters)
  GET  /student/jobs/{job_id}     job detail with full company info
  GET  /student/companies         all active companies (with job counts)
  WS   /student/ws/jobs           real-time job updates feed

WebSocket event schema:
  { "event": "job_created",     "job": { ...job fields... } }
  { "event": "job_updated",     "job": { ...job fields... } }
  { "event": "job_deleted",     "job": { "id": "...", "company_profile_id": "..." } }
  { "event": "job_activated",   "job": { ...job fields... } }
  { "event": "job_deactivated", "job": { ...job fields... } }

Connect WebSocket:
  ws://localhost:8000/api/v1/student/ws/jobs
  Send "ping" → receive "pong" (heartbeat)
"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import or_, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
from app.models.company_profile import CompanyProfile
from app.models.job import Job
from app.models.student import Student
from app.models.user import User
from app.models.skill import Skill
from app.schemas.student import StudentUpdate, StudentResponse

router = APIRouter(prefix="/student", tags=["student-api"])


# ─── Profile Management ────────────────────────────────────────────────────────

@router.get("/profile", response_model=StudentResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Student).where(Student.user_id == current_user.id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    # Pre-fetch skills to avoid lazy loading issues if needed, 
    # but here we can just return it.
    return student


@router.patch("/profile", response_model=StudentResponse)
async def update_my_profile(
    data: StudentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Student).where(Student.user_id == current_user.id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    update_data = data.model_dump(exclude_unset=True)
    
    # Handle skills separately if provided
    if "skills" in update_data:
        skill_names = update_data.pop("skills")
        # Clear existing skills and add new ones
        student.skills = []
        for name in skill_names:
            sk_res = await db.execute(select(Skill).where(Skill.name == name))
            sk = sk_res.scalar_one_or_none()
            if not sk:
                sk = Skill(id=uuid.uuid4(), name=name)
                db.add(sk)
            student.skills.append(sk)

    for key, value in update_data.items():
        setattr(student, key, value)

    await db.commit()
    await db.refresh(student)
    return student


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _job_row(j: Job) -> dict:
    return {
        "id": str(j.id),
        "company_name": j.company_name,
        "company_profile_id": str(j.company_profile_id) if j.company_profile_id else None,
        "role_title": j.role_title,
        "location": j.location,
        "salary_min": j.salary_min,
        "salary_max": j.salary_max,
        "experience_min": j.experience_min,
        "experience_max": j.experience_max,
        "job_type": j.job_type.value if j.job_type else None,
        "description": j.description,
        "deadline": j.deadline.isoformat() if j.deadline else None,
        "is_active": j.is_active,
        "created_at": j.created_at.isoformat(),
    }


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("/jobs", response_model=dict)
async def list_all_jobs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(
        None,
        description="Full-text search across role_title, company_name, description",
    ),
    location: Optional[str] = None,
    job_type: Optional[str] = None,
    company_name: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Return ALL active jobs from ALL companies.

    This is the student job board endpoint.
    Supports search (role, company, description), location, job_type,
    and company_name filters with pagination.
    """
    query = select(Job).where(Job.is_active == True)

    if search:
        query = query.where(
            or_(
                Job.role_title.ilike(f"%{search}%"),
                Job.company_name.ilike(f"%{search}%"),
                Job.description.ilike(f"%{search}%"),
            )
        )
    if location:
        query = query.where(Job.location.ilike(f"%{location}%"))
    if job_type:
        query = query.where(Job.job_type == job_type)
    if company_name:
        query = query.where(Job.company_name.ilike(f"%{company_name}%"))

    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    result = await db.execute(
        query.order_by(Job.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    jobs = result.scalars().all()

    return {
        "success": True,
        "data": [_job_row(j) for j in jobs],
        "meta": {"page": page, "limit": limit, "total": total or 0},
    }


@router.get("/jobs/{job_id}")
async def get_job_detail(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Get full detail for a single active job, including the company profile.

    Returns 404 if the job is inactive (expired/closed).
    The `company` block gives students rich company info (logo, website, etc.).
    """
    job = await db.get(Job, job_id)
    if not job or not job.is_active:
        raise HTTPException(status_code=404, detail="Job not found")

    company_data = None
    if job.company_profile_id:
        company = await db.get(CompanyProfile, job.company_profile_id)
        if company:
            company_data = {
                "id": str(company.id),
                "company_name": company.company_name,
                "website": company.website,
                "logo_url": company.logo_url,
                "industry_type": company.industry_type,
                "location": company.location,
                "company_size": company.company_size,
                "description": company.description,
                "linkedin_url": company.linkedin_url,
                "founded_year": company.founded_year,
            }

    return {
        "success": True,
        "data": {
            **_job_row(job),
            "company": company_data,
        },
    }


@router.get("/companies")
async def list_companies(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    search: Optional[str] = None,
    industry_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    List all active (non-draft) companies.

    Includes a live `active_jobs_count` per company so students can see
    which companies are currently hiring.
    """
    query = select(CompanyProfile).where(CompanyProfile.is_draft == False)
    if search:
        query = query.where(CompanyProfile.company_name.ilike(f"%{search}%"))
    if industry_type:
        query = query.where(CompanyProfile.industry_type == industry_type)

    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    result = await db.execute(
        query.order_by(CompanyProfile.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    companies = result.scalars().all()

    company_ids = [c.id for c in companies]
    job_counts: dict = {}
    if company_ids:
        counts_result = await db.execute(
            select(Job.company_profile_id, func.count(Job.id).label("cnt"))
            .where(Job.company_profile_id.in_(company_ids), Job.is_active == True)
            .group_by(Job.company_profile_id)
        )
        job_counts = {row.company_profile_id: row.cnt for row in counts_result.all()}

    data = [
        {
            "id": str(c.id),
            "company_name": c.company_name,
            "website": c.website,
            "logo_url": c.logo_url,
            "industry_type": c.industry_type,
            "location": c.location,
            "company_size": c.company_size,
            "description": c.description,
            "founded_year": c.founded_year,
            "active_jobs_count": job_counts.get(c.id, 0),
        }
        for c in companies
    ]

    return {
        "success": True,
        "data": data,
        "meta": {"page": page, "limit": limit, "total": total or 0},
    }


@router.websocket("/ws/jobs")
async def jobs_websocket(websocket: WebSocket):
    """
    Real-time job updates WebSocket endpoint.

    Connect: ws://localhost:8000/api/v1/student/ws/jobs
    Heartbeat: send "ping" → server replies "pong"

    Events pushed by the server:
      job_created    — a company posted a new job
      job_updated    — a company edited a job
      job_deleted    — a company removed a job
      job_activated  — a company re-opened a closed job
      job_deactivated — a company closed an active job
    """
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
