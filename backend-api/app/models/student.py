import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, SmallInteger, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Student(Base):
    __tablename__ = "students"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20))
    college: Mapped[str | None] = mapped_column(String(200))
    branch: Mapped[str | None] = mapped_column(String(100))
    graduation_year: Mapped[int | None] = mapped_column(SmallInteger)
    cgpa: Mapped[float | None] = mapped_column(Numeric(4, 2))
    resume_url: Mapped[str | None] = mapped_column()
    ats_score: Mapped[int | None] = mapped_column(SmallInteger)
    linkedin_url: Mapped[str | None] = mapped_column()
    github_url: Mapped[str | None] = mapped_column()
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    user = relationship("User", backref="student")
