import uuid
from sqlalchemy import Column, Text, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from app.database import Base


class GeneratedRoadmap(Base):
    __tablename__ = "generated_roadmaps"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    roadmap_key = Column(Text, unique=True, nullable=False, index=True)
    title = Column(Text, nullable=True)
    role = Column(Text, nullable=False)
    level = Column(Text, nullable=True)
    duration_weeks = Column(Integer, nullable=True)
    source_prompt = Column(Text, nullable=True)
    payload = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<GeneratedRoadmap(id={self.id}, role={self.role}, key={self.roadmap_key})>"
