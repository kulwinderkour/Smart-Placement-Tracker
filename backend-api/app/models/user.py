import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserRole(str, enum.Enum):
    student = "student"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="userrole"),
        default=UserRole.student,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    # Relationships
    roadmaps = relationship("Roadmap", back_populates="user", cascade="all, delete-orphan")
