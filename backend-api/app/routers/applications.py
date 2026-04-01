import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.application import Application
from app.models.student import Student
from app.models.user import User
from app.schemas.application import ApplicationCreate, ApplicationResponse, ApplicationUpdate

router = APIRouter(prefix="/applications", tags=["applications"])


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

    app = Application(
        id=uuid.uuid4(),
        student_id=student.id,
        job_id=data.job_id,
        notes=data.notes,
        resume_url=data.resume_url,
        cover_letter=data.cover_letter,
        agent_applied=data.agent_applied,
    )
    db.add(app)
    await db.commit()
    await db.refresh(app)
    return app


@router.get("/my")
async def my_applications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Student).where(Student.user_id == current_user.id))
    student = result.scalar_one_or_none()
    if not student:
        return []

    apps_result = await db.execute(
        select(Application, Job.company_name, Job.role_title, Job.salary_min)
        .join(Job, Job.id == Application.job_id)
        .where(Application.student_id == student.id)
        .order_by(Application.applied_at.desc())
    )

    return [
        {
            "id": str(app.id),
            "job_id": str(app.job_id),
            "company": company_name,
            "role": role_title,
            "package_lpa": salary_min,
            "status": app.status.value,
            "applied_at": app.applied_at.isoformat(),
            "notes": app.notes,
        }
        for app, company_name, role_title, salary_min in apps_result.all()
    ]


@router.patch("/{app_id}", response_model=ApplicationResponse)
async def update_application(
    app_id: uuid.UUID,
    data: ApplicationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    app = await db.get(Application, app_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    for key, value in data.model_dump(exclude_none=True).items():
        setattr(app, key, value)

    await db.commit()
    await db.refresh(app)
    return app
