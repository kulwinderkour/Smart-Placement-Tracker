from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.interview_gen import generate_interview_questions

router = APIRouter(prefix="/ai", tags=["interview"])


class InterviewRequest(BaseModel):
    job_title: str
    job_description: str = ""
    skills: list[str] = []
    difficulty: str = "medium"
    num_questions: int = 10


@router.post("/interview/questions")
async def get_interview_questions(request: InterviewRequest):
    if request.difficulty not in ["easy", "medium", "hard"]:
        raise HTTPException(
            status_code=400, detail="Difficulty must be easy, medium, or hard."
        )

    result = generate_interview_questions(
        job_title=request.job_title,
        job_description=request.job_description,
        skills=request.skills,
        difficulty=request.difficulty,
        num_questions=min(request.num_questions, 20),
    )
    return {"success": True, "data": result}
