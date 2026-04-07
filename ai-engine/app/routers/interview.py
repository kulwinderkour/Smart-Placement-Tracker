from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.interview_gen import generate_interview_questions
from app.services.question_cache import get_or_generate_questions

router = APIRouter(prefix="/ai", tags=["interview"])


class InterviewRequest(BaseModel):
    job_title: str
    job_description: str = ""
    skills: list[str] = []
    difficulty: str = "medium"
    num_questions: int = 10
    question_type: str = "mcq"


@router.post("/interview/questions")
async def get_interview_questions(
    request: InterviewRequest,
    db: AsyncSession = Depends(get_db),
):
    if request.difficulty not in ["easy", "medium", "hard"]:
        raise HTTPException(
            status_code=400, detail="Difficulty must be easy, medium, or hard."
        )

    num = min(request.num_questions, 20)

    payload, source = await get_or_generate_questions(
        job_title=request.job_title,
        skills=request.skills,
        difficulty=request.difficulty,
        question_type=request.question_type,
        num_questions=num,
        db=db,
        generator=generate_interview_questions,
    )

    return {"success": True, "source": source, "data": payload}
