from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from app.models.application import ApplicationStatus


class ApplicationCreate(BaseModel):
    job_id: UUID
    notes: Optional[str] = None


class ApplicationUpdate(BaseModel):
    status: Optional[ApplicationStatus] = None
    notes: Optional[str] = None
    next_step_date: Optional[date] = None
    offer_ctc: Optional[int] = None


class ApplicationResponse(BaseModel):
    id: UUID
    student_id: UUID
    job_id: UUID
    status: ApplicationStatus
    applied_at: datetime
    notes: Optional[str]
    next_step_date: Optional[date]
    offer_ctc: Optional[int]

    model_config = {"from_attributes": True}
