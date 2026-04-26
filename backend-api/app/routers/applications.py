import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.application import Application, ApplicationStatus
from app.models.job import Job
from app.models.student import Student
from app.models.user import User, UserRole
from app.schemas.application import (
    ApplicationCreate,
    ApplicationResponse,
    ApplicationStatusPatch,
    ApplicationUpdate,
)

router = APIRouter(prefix="/applications", tags=["applications"])


STATUS_TO_DB = {
    "Pending": ApplicationStatus.applied,
    "Approved": ApplicationStatus.offer,
    "Rejected": ApplicationStatus.rejected,
    "Shortlisted": ApplicationStatus.hr_round,
}

DB_TO_STATUS = {
    ApplicationStatus.applied: "Pending",
    ApplicationStatus.online_test: "Pending",
    ApplicationStatus.technical_round: "Pending",
    ApplicationStatus.hr_round: "Shortlisted",
    ApplicationStatus.offer: "Approved",
    ApplicationStatus.rejected: "Rejected",
}


def _serialize_application(app: Application) -> dict:
    return {
        "id": app.id,
        "userId": app.user_id,
        "student_id": app.student_id,
        "jobId": app.job_id,
        "jobTitle": app.job_title,
        "company": app.company,
        "status": DB_TO_STATUS.get(app.status, "Pending"),
        "applied_at": app.applied_at,
        "notes": app.notes,
        "resume_url": app.resume_url,
        "cover_letter": app.cover_letter,
        "agent_applied": app.agent_applied,
        "next_step_date": app.next_step_date,
        "offer_ctc": app.offer_ctc,
    }


@router.post("", response_model=ApplicationResponse, status_code=201)
async def apply(
    data: ApplicationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Student).where(Student.user_id == current_user.id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    job = await db.get(Job, data.job_id)
    if not job or not job.is_active:
        raise HTTPException(status_code=404, detail="Job not found")
    
    existing = await db.execute(
        select(Application).where(
            Application.student_id == student.id,
            Application.job_id == data.job_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Already applied")
    
    # Update student profile with provided details if any
    if data.full_name: student.full_name = data.full_name
    if data.phone: student.phone = data.phone
    if data.college: student.college = data.college
    if data.branch: student.branch = data.branch
    if data.cgpa is not None: student.cgpa = data.cgpa
    if data.dob: student.dob = data.dob
    if data.gender: student.gender = data.gender
    if data.resume_url: student.resume_url = data.resume_url
    
    app = Application(
        id=uuid.uuid4(),
        user_id=current_user.id,
        student_id=student.id,
        job_id=data.job_id,
        job_title=job.role_title,
        company=job.company_name,
        status=ApplicationStatus.applied,  # Pending in API mapping
        agent_applied=data.agent_applied,
        resume_url=data.resume_url or student.resume_url,
        cover_letter=data.cover_letter,
    )
    db.add(app)
    try:
        await db.commit()
        await db.refresh(app)
    except Exception as exc:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save application: {exc}") from exc
    return _serialize_application(app)


@router.get("", response_model=dict)
async def my_applications(
    status: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Student).where(Student.user_id == current_user.id))
    student = result.scalar_one_or_none()
    if not student:
        return []

    query = select(Application).where(Application.student_id == student.id)
    if status:
        db_status = STATUS_TO_DB.get(status)
        if not db_status:
            raise HTTPException(status_code=400, detail="Invalid status filter")
        query = query.where(Application.status == db_status)
    apps_result = await db.execute(query.order_by(Application.applied_at.desc()))
    apps = apps_result.scalars().all()
    payload = [_serialize_application(app) for app in apps]
    return {"applications": payload, "total": len(payload)}


@router.patch("/{app_id}/status", response_model=ApplicationResponse)
async def update_application_status(
    app_id: uuid.UUID,
    data: ApplicationStatusPatch,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Admin only")
    app = await db.get(Application, app_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    mapped = STATUS_TO_DB.get(data.status)
    if not mapped or data.status == "Pending":
        raise HTTPException(status_code=400, detail="Status must be Approved, Rejected, or Shortlisted")
    app.status = mapped

    await db.commit()
    await db.refresh(app)
    return _serialize_application(app)


# Backward compatibility for existing dashboard calls
@router.get("/my", response_model=list[dict])
async def my_applications_legacy(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await my_applications(db=db, current_user=current_user)
    return result["applications"]


@router.patch("/{app_id}", response_model=ApplicationResponse)
async def update_application_legacy(
    app_id: uuid.UUID,
    data: ApplicationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    app = await db.get(Application, app_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    if data.status is not None:
        app.status = data.status
    if data.notes is not None:
        app.notes = data.notes
    if data.resume_url is not None:
        app.resume_url = data.resume_url
    if data.cover_letter is not None:
        app.cover_letter = data.cover_letter
    if data.next_step_date is not None:
        app.next_step_date = data.next_step_date
    if data.offer_ctc is not None:
        app.offer_ctc = data.offer_ctc
    await db.commit()
    await db.refresh(app)
    return _serialize_application(app)
