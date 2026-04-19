import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.models.application import Application
from app.models.job import Job
from app.models.student import Student
from app.models.user import User

router = APIRouter(prefix="/internal/agent", tags=["agent-internal"])


class AgentApplyRequest(BaseModel):
    job_id: str
    user_id: str
    resume_path: str = "resume.pdf"
    cover_letter: str | None = None


class JobUpsertRequest(BaseModel):
    source_url: str
    company_name: str
    role_title: str
    description: str = ""


@router.post("/upsert-job")
async def agent_upsert_job(data: JobUpsertRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(Job).where(Job.source_url == data.source_url))
    job = existing.scalar_one_or_none()
    if job:
        return {"id": str(job.id), "created": False}

    new_job = Job(
        id=uuid.uuid4(),
        source_url=data.source_url,
        company_name=data.company_name,
        role_title=data.role_title,
        description=data.description,
        is_active=True,
    )
    db.add(new_job)
    await db.commit()
    return {"id": str(new_job.id), "created": True}


@router.post("/apply")
async def agent_apply(data: AgentApplyRequest, db: AsyncSession = Depends(get_db)):
    try:
        job_uuid = uuid.UUID(data.job_id)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid job_id: {data.job_id}")

    try:
        user_uuid = uuid.UUID(data.user_id)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid user_id: {data.user_id}")

    job = await db.get(Job, job_uuid)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {data.job_id} not found")

    result = await db.execute(select(Student).where(Student.user_id == user_uuid))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found for this user")

    existing = await db.execute(
        select(Application).where(
            Application.student_id == student.id,
            Application.job_id == job_uuid,
        )
    )
    if existing.scalar_one_or_none():
        return {"status": "already_applied", "job_id": data.job_id}

    application = Application(
        id=uuid.uuid4(),
        student_id=student.id,
        job_id=job_uuid,
        notes=f"Applied via AI Agent | Resume: {data.resume_path}",
        cover_letter=data.cover_letter,
        agent_applied=True,
    )
    db.add(application)
    await db.commit()
    return {"status": "applied", "job_id": data.job_id, "application_id": str(application.id)}


@router.get("/applications/{user_id}")
async def agent_get_applications(user_id: str, db: AsyncSession = Depends(get_db)):
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid user_id: {user_id}")

    result = await db.execute(select(Student).where(Student.user_id == user_uuid))
    student = result.scalar_one_or_none()
    if not student:
        return []

    apps_result = await db.execute(
        select(Application, Job.company_name, Job.role_title, Job.salary_min)
        .join(Job, Job.id == Application.job_id)
        .where(Application.student_id == student.id)
        .order_by(Application.applied_at.desc())
        .limit(20)
    )

    return [
        {
            "id": str(app.id),
            "company": company_name,
            "role": role_title,
            "package_lpa": salary_min,
            "status": app.status.value,
            "applied_at": app.applied_at.isoformat(),
        }
        for app, company_name, role_title, salary_min in apps_result.all()
    ]


@router.delete("/applications/{user_id}/{application_id}")
async def agent_delete_application(
    user_id: str, application_id: str, db: AsyncSession = Depends(get_db)
):
    try:
        user_uuid = uuid.UUID(user_id)
        app_uuid = uuid.UUID(application_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid user_id or application_id")

    result = await db.execute(select(Student).where(Student.user_id == user_uuid))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    app_result = await db.execute(
        select(Application).where(
            Application.id == app_uuid,
            Application.student_id == student.id,
        )
    )
    application = app_result.scalar_one_or_none()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    await db.delete(application)
    await db.commit()
    return {"deleted": True, "application_id": application_id}
