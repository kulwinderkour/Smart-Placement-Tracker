from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.questions import QuestionRequest, QuestionResponse, EvaluationRequest
from app.services.question_service import QuestionService
from typing import List

router = APIRouter(prefix="/questions", tags=["questions"])


@router.post("/generate", response_model=QuestionResponse)
async def generate_questions(
    request: QuestionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate AI-powered questions based on topic, difficulty, and user skills"""
    try:
        service = QuestionService(db)
        result = await service.generate_questions(
            topic=request.topic,
            difficulty=request.difficulty,
            question_type=request.type,
            count=request.count,
            user_skills=request.userSkills or [],
            custom_question=request.customQuestion
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate questions: {str(e)}")


@router.get("/topics")
async def get_suggested_topics(
    skills: str = None,
    current_user: User = Depends(get_current_user)
):
    """Get suggested topics based on user skills"""
    try:
        service = QuestionService(None)  # No DB needed for topics
        skill_list = skills.split(',') if skills else []
        result = await service.get_suggested_topics(skill_list)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get topics: {str(e)}")


@router.post("/evaluate")
async def evaluate_answer(
    request: EvaluationRequest,
    current_user: User = Depends(get_current_user)
):
    """AI evaluation of theory/coding answers"""
    try:
        service = QuestionService(None)  # No DB needed for evaluation
        result = await service.evaluate_answer(
            question=request.question,
            user_answer=request.userAnswer,
            correct_answer=request.correctAnswer,
            topic=request.topic
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to evaluate answer: {str(e)}")
