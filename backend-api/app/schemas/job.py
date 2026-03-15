from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from app.models.job import JobType


class JobCreate(BaseModel):
    company_name: str
    role_title: str
    location: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    job_type: Optional[JobType] = None
    description: Optional[str] = None
    deadline: Optional[date] = None


class JobResponse(BaseModel):
    id: UUID
    company_name: str
    role_title: str
    location: Optional[str]
    salary_min: Optional[int]
    salary_max: Optional[int]
    job_type: Optional[JobType]
    deadline: Optional[date]
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
