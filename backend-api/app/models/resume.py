import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Resume(Base):
    __tablename__ = "resumes"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("students.id"), nullable=False, index=True
    )
    gcs_key: Mapped[str] = mapped_column(Text, nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )

    student = relationship("Student", backref="resumes")
    analyses = relationship(
        "ResumeAnalysis", back_populates="resume", cascade="all, delete-orphan"
    )


class ResumeAnalysis(Base):
    __tablename__ = "resume_analyses"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("students.id"), nullable=False, index=True
    )
    resume_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("resumes.id"), nullable=False, index=True
    )
    ats_score: Mapped[int] = mapped_column(Integer, nullable=False)
    feedback: Mapped[str | None] = mapped_column(Text)
    job_description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )

    resume = relationship("Resume", back_populates="analyses")
