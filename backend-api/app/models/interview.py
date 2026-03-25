import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class InterviewMode(str, enum.Enum):
    google_meet = "google_meet"
    zoom = "zoom"
    offline = "offline"


class InterviewStatus(str, enum.Enum):
    scheduled = "scheduled"
    completed = "completed"
    cancelled = "cancelled"


class Interview(Base):
    __tablename__ = "interviews"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("students.id"), nullable=False)
    job_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("jobs.id"), nullable=False)
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    mode: Mapped[InterviewMode] = mapped_column(
        Enum(InterviewMode, name="interviewmode"), default=InterviewMode.google_meet
    )
    meeting_link: Mapped[str | None] = mapped_column(String(500))
    status: Mapped[InterviewStatus] = mapped_column(
        Enum(InterviewStatus, name="interviewstatus"), default=InterviewStatus.scheduled
    )
    notes: Mapped[str | None] = mapped_column(Text)
    feedback_rating: Mapped[int | None] = mapped_column(Integer)
    feedback_comment: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    student = relationship("Student", backref="interviews")
    job = relationship("Job", backref="interviews")
