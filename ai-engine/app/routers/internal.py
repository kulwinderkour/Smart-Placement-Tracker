import logging

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.skill_extractor import extract_skills_from_text

router = APIRouter(prefix="/internal", tags=["internal"])
logger = logging.getLogger(__name__)


class JobPayload(BaseModel):
    source_url: str
    company_name: str
    role_title: str
    description: str = ""


@router.post("/process-job")
async def process_job(payload: JobPayload, db: AsyncSession = Depends(get_db)):
    """
    Called by the collector after saving a new job.
    Extracts skills from JD and links them to the job in DB.
    """
    result = await db.execute(
        text("SELECT id FROM jobs WHERE source_url = :url"),
        {"url": payload.source_url},
    )
    row = result.fetchone()
    if not row:
        return {"success": False, "message": "Job not found in database"}

    job_id = row[0]

    skills = extract_skills_from_text(f"{payload.role_title} {payload.description}")

    if not skills:
        return {"success": True, "message": "No skills extracted", "skills_count": 0}

    for skill in skills:
        await db.execute(
            text(
                """
                INSERT INTO skills (id, name, category)
                VALUES (gen_random_uuid(), :name, :category)
                ON CONFLICT (name) DO NOTHING
                """
            ),
            {"name": skill["name"], "category": skill["category"]},
        )

        await db.execute(
            text(
                """
                INSERT INTO job_skills (job_id, skill_id)
                SELECT :job_id, id FROM skills WHERE name = :name
                ON CONFLICT DO NOTHING
                """
            ),
            {"job_id": str(job_id), "name": skill["name"]},
        )

    await db.execute(
        text("UPDATE jobs SET processed_at = NOW() WHERE id = :id"),
        {"id": str(job_id)},
    )
    await db.commit()

    logger.info(f"Processed job {job_id} — {len(skills)} skills extracted")
    return {
        "success": True,
        "skills_count": len(skills),
        "skills": [s["name"] for s in skills],
    }
