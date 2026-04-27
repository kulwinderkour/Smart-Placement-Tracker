"""
Agent execution logs for the autonomous AI agent system.
Stores every step of the agent pipeline for debugging and audit.
"""

import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AgentType(str, enum.Enum):
    intent = "intent"           # Intent parsing agent
    resume = "resume"           # Resume extraction agent
    validation = "validation"   # Job validation agent
    auto_apply = "auto_apply"   # Auto apply pipeline agent
    cover_letter = "cover_letter"  # Cover letter generation


class AgentStatus(str, enum.Enum):
    started = "started"
    success = "success"
    failed = "failed"
    retry = "retry"
    recovered = "recovered"


class AgentLog(Base):
    """
    Logs every agent execution step.
    
    Query examples:
    - Get student's last auto-apply run: filter by student_id + agent_type
    - Debug why job was filtered: filter by session_id + step="filter"
    - Track retry patterns: filter by status="retry"
    """
    __tablename__ = "agent_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Context
    student_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("students.id", ondelete="SET NULL"), 
        nullable=True, 
        index=True
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        nullable=False, 
        index=True
    )  # Groups related steps together
    
    # Agent identification
    agent_type: Mapped[AgentType] = mapped_column(
        Enum(AgentType, name="agent_type"), 
        nullable=False
    )
    step: Mapped[str] = mapped_column(String(100), nullable=False)  # Pipeline step name
    status: Mapped[AgentStatus] = mapped_column(
        Enum(AgentStatus, name="agent_status"), 
        nullable=False
    )
    
    # Data
    input_data: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    output_data: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    
    # Extra context for querying/filtering
    extra_data: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    # Expected extra_data fields:
    # - job_id: UUID of job being processed
    # - prediction_score: float (match score from model)
    # - filter_reason: str (why job was filtered out)
    # - application_id: UUID (if application was created)
    # - gemini_model: str (which Gemini model was used)
    # - retry_count: int (how many retries before success)
    
    # Error tracking
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    
    # Retry tracking
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    max_retries: Mapped[int] = mapped_column(Integer, default=3)
    
    # Performance
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        default=datetime.utcnow,
        index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )
