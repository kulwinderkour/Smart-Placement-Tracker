from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from app.models.application import ApplicationStatus


class ApplicationCreate(BaseModel):
    jobId: UUID


class ApplicationUpdate(BaseModel):
    status: Optional[ApplicationStatus] = None
    notes: Optional[str] = None
    resume_url: Optional[str] = None
    cover_letter: Optional[str] = None
    next_step_date: Optional[date] = None
    offer_ctc: Optional[int] = None


class ApplicationStatusPatch(BaseModel):
    status: str


class ApplicationResponse(BaseModel):
    id: UUID
    userId: UUID | None = None
    student_id: UUID
    jobId: UUID
    jobTitle: Optional[str] = None
    company: Optional[str] = None
    status: str
    applied_at: datetime
    notes: Optional[str] = None
    resume_url: Optional[str] = None
    cover_letter: Optional[str] = None
    agent_applied: bool = False
    next_step_date: Optional[date] = None
    offer_ctc: Optional[int] = None

    model_config = {"from_attributes": True}
