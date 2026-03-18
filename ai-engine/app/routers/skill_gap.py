from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.recommender import get_skill_gap

router = APIRouter(prefix="/ai", tags=["skill-gap"])


@router.get("/skill-gap/{student_id}/{job_id}")
async def skill_gap(student_id: str, job_id: str, db: AsyncSession = Depends(get_db)):
    student_result = await db.execute(
        text(
            """
            SELECT s.name FROM skills s
            JOIN student_skills ss ON ss.skill_id = s.id
            WHERE ss.student_id = :sid
            """
        ),
        {"sid": student_id},
    )
    student_skills = [row[0] for row in student_result.fetchall()]

    job_result = await db.execute(
        text(
            """
            SELECT s.name FROM skills s
            JOIN job_skills js ON js.skill_id = s.id
            WHERE js.job_id = :jid
            """
        ),
        {"jid": job_id},
    )
    job_skills = [row[0] for row in job_result.fetchall()]

    if not job_skills:
        raise HTTPException(status_code=404, detail="No skills found for this job.")

    gap = get_skill_gap(student_skills, job_skills)
    return {
        "success": True,
        "data": gap,
        "student_id": student_id,
        "job_id": job_id,
    }
