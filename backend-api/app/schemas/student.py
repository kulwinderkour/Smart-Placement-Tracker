from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, field_validator


class StudentCreate(BaseModel):
    full_name: str
    phone: Optional[str] = None
    college: Optional[str] = None
    branch: Optional[str] = None
    graduation_year: Optional[int] = None
    cgpa: Optional[float] = None
    skills: Optional[list[str]] = None
    job_type: Optional[str] = None
    resume_url: Optional[str] = None
    resume_name: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None


class StudentUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    college: Optional[str] = None
    branch: Optional[str] = None
    graduation_year: Optional[int] = None
    cgpa: Optional[float] = None
    skills: Optional[list[str]] = None
    job_type: Optional[str] = None
    resume_url: Optional[str] = None
    resume_name: Optional[str] = None
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
    job_type: Optional[str]
    resume_url: Optional[str]
    resume_name: Optional[str]
    ats_score: Optional[int]
    linkedin_url: Optional[str]
    github_url: Optional[str]
    created_at: datetime
    skills: list[str] = []

    model_config = {"from_attributes": True}

    @field_validator("skills", mode="before")
    @classmethod
    def coerce_skills_to_strings(cls, v):
        if not v:
            return []
        result = []
        for item in v:
            if isinstance(item, str):
                result.append(item)
            elif hasattr(item, "name"):
                result.append(str(item.name))
            elif isinstance(item, dict):
                result.append(str(item.get("name", "")))
        return [s for s in result if s]
