from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal


class QuestionRequest(BaseModel):
    topic: str = Field(..., description="Topic for questions")
    difficulty: Literal["easy", "medium", "hard"] = Field(..., description="Difficulty level")
    type: Literal["mcq", "coding", "theory", "situational", "mixed"] = Field(..., description="Question type")
    count: int = Field(default=10, ge=1, le=50, description="Number of questions")
    userSkills: List[str] = Field(default=[], description="User's skills for personalization")
    customQuestion: bool = Field(default=False, description="Whether this is a custom question")


class QuestionOption(BaseModel):
    id: str
    text: str


class Question(BaseModel):
    id: str
    type: str
    question: str
    options: List[str] = []
    correctAnswer: str
    explanation: str
    topic: str
    difficulty: str
    examples: Optional[List[Dict[str, str]]] = []
    hints: Optional[List[str]] = []


class QuestionData(BaseModel):
    topic: str
    difficulty: str
    type: str
    totalQuestions: int
    questions: List[Question]


class QuestionResponse(BaseModel):
    data: QuestionData
    fromCache: bool = False
    stale: bool = False


class EvaluationRequest(BaseModel):
    question: str
    userAnswer: str
    correctAnswer: str
    topic: str


class EvaluationResponse(BaseModel):
    score: int
    maxScore: int
    grade: str
    feedback: str
    strengths: List[str]
    improvements: List[str]
    betterAnswer: str


class TopicsResponse(BaseModel):
    topics: List[str]
