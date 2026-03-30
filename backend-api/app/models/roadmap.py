from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON, BigInteger
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Roadmap(Base):
    __tablename__ = "roadmaps"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)  # nullable for shared roadmaps
    field = Column(String(255), nullable=False, index=True)  # field/role name
    title = Column(String(500), nullable=False)
    description = Column(Text)
    role = Column(String, nullable=False, index=True)
    skills = Column(Text, nullable=False)  # JSON string of skills array
    roadmap_data = Column(JSON, nullable=False)
    difficulty_level = Column(String(50), default="intermediate")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    generated_by = Column(String(100), default="gemini-1.5-flash")
    usage_count = Column(BigInteger, default=0)
    last_accessed = Column(DateTime(timezone=True), server_default=func.now())
    is_public = Column(String(10), default="true")  # for sharing between users

    # Relationship to User
    user = relationship("User", back_populates="roadmaps")

    def __repr__(self):
        return f"<Roadmap(id={self.id}, field={self.field}, user_id={self.user_id}, usage_count={self.usage_count})>"
