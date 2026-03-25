import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Integer, SmallInteger, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class JobType(str, enum.Enum):
    full_time = "full_time"
    intern = "intern"
    contract = "contract"


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    company_profile_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("company_profiles.id"), nullable=True, index=True
    )
    source_url: Mapped[str | None] = mapped_column(unique=True)
    source_hash: Mapped[str | None] = mapped_column(String(32))
    company_name: Mapped[str] = mapped_column(String(200), nullable=False)
    role_title: Mapped[str] = mapped_column(String(200), nullable=False)
    location: Mapped[str | None] = mapped_column(String(200))
    salary_min: Mapped[int | None] = mapped_column(Integer)
    salary_max: Mapped[int | None] = mapped_column(Integer)
    experience_min: Mapped[int | None] = mapped_column(SmallInteger)
    experience_max: Mapped[int | None] = mapped_column(SmallInteger)
    job_type: Mapped[JobType | None] = mapped_column(Enum(JobType))
    description: Mapped[str | None] = mapped_column(Text)
    deadline: Mapped[date | None] = mapped_column(Date)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    collected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    company_profile = relationship("CompanyProfile", backref="jobs", lazy="select")
