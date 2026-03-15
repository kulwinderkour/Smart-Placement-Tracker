from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class StudentCreate(BaseModel):
    full_name: str
    phone: Optional[str] = None
    college: Optional[str] = None
    branch: Optional[str] = None
    graduation_year: Optional[int] = None
    cgpa: Optional[float] = None
    resume_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None


class StudentUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    college: Optional[str] = None
    branch: Optional[str] = None
    graduation_year: Optional[int] = None
    cgpa: Optional[float] = None
    resume_url: Optional[str] = None
    ats_score: Optional[int] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None


class StudentResponse(BaseModel):
    id: UUID
    user_id: UUID
    full_name: str
    phone: Optional[str]
    college: Optional[str]
    branch: Optional[str]
    graduation_year: Optional[int]
    cgpa: Optional[float]
    resume_url: Optional[str]
    ats_score: Optional[int]
    linkedin_url: Optional[str]
    github_url: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}
