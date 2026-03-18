from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.recommender import get_recommendations

router = APIRouter(prefix="/ai", tags=["recommendations"])


@router.get("/recommend/{student_id}")
async def recommend_jobs(student_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text(
            """
            SELECT s.name FROM skills s
            JOIN student_skills ss ON ss.skill_id = s.id
            JOIN students st ON st.id = ss.student_id
            WHERE st.id = :student_id
            """
        ),
        {"student_id": student_id},
    )
    student_skills = [row[0] for row in result.fetchall()]

    if not student_skills:
        raise HTTPException(status_code=404, detail="No skills found for this student.")

    jobs_result = await db.execute(
        text(
            """
            SELECT j.id, j.role_title, j.company_name, j.location,
                   array_agg(s.name) as skills
            FROM jobs j
            LEFT JOIN job_skills js ON js.job_id = j.id
            LEFT JOIN skills s ON s.id = js.skill_id
            WHERE j.is_active = true
            GROUP BY j.id, j.role_title, j.company_name, j.location
            LIMIT 200
            """
        )
    )
    jobs = [
        {
            "id": str(row[0]),
            "role_title": row[1],
            "company_name": row[2],
            "location": row[3],
            "skills": [s for s in (row[4] or []) if s],
        }
        for row in jobs_result.fetchall()
    ]

    recommendations = get_recommendations(student_skills, jobs, top_n=10)
    return {"success": True, "data": recommendations, "student_id": student_id}
