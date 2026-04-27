"""
Structured logging for agent operations.
Sends logs to backend API for persistence.
"""

from __future__ import annotations

import json
import logging
import os
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class AgentType(str, Enum):
    INTENT = "intent"
    RESUME = "resume"
    VALIDATION = "validation"
    AUTO_APPLY = "auto_apply"
    COVER_LETTER = "cover_letter"


class AgentStatus(str, Enum):
    STARTED = "started"
    SUCCESS = "success"
    FAILED = "failed"
    RETRY = "retry"
    RECOVERED = "recovered"


@dataclass
class AgentLogEntry:
    """Single agent execution log entry."""
    session_id: uuid.UUID
    agent_type: AgentType
    step: str
    status: AgentStatus
    student_id: uuid.UUID | None = None
    input_data: dict[str, Any] | None = None
    output_data: dict[str, Any] | None = None
    extra_data: dict[str, Any] | None = None
    error_message: str | None = None
    error_type: str | None = None
    retry_count: int = 0
    duration_ms: int | None = None
    created_at: datetime = field(default_factory=datetime.utcnow)


def _backend_api_v1_base() -> str:
    """Normalize BACKEND_URL to .../api/v1."""
    raw = (os.getenv("BACKEND_URL") or settings.BACKEND_URL or "http://localhost:8000").rstrip("/")
    if raw.endswith("/api/v1"):
        return raw
    return f"{raw}/api/v1"


class AgentLogger:
    """
    Async logger for agent operations.
    
    Usage:
        logger = AgentLogger(session_id, student_id)
        
        async with logger.step("intent_parsing", AgentType.INTENT) as step:
            result = await parse_intent(instruction)
            step.set_output({"intent": result})
    """
    
    def __init__(
        self,
        session_id: uuid.UUID,
        student_id: uuid.UUID | None = None,
        api_token: str | None = None
    ):
        self.session_id = session_id
        self.student_id = student_id
        self.api_token = api_token or ""
        self.api_base = _backend_api_v1_base()
        self._logs: list[AgentLogEntry] = []
    
    def _log(
        self,
        agent_type: AgentType,
        step: str,
        status: AgentStatus,
        input_data: dict | None = None,
        output_data: dict | None = None,
        extra_data: dict | None = None,
        error: Exception | None = None,
        retry_count: int = 0,
        duration_ms: int | None = None
    ) -> None:
        """Create log entry."""
        entry = AgentLogEntry(
            session_id=self.session_id,
            agent_type=agent_type,
            step=step,
            status=status,
            student_id=self.student_id,
            input_data=input_data,
            output_data=output_data,
            extra_data=extra_data,
            error_message=str(error)[:500] if error else None,
            error_type=type(error).__name__ if error else None,
            retry_count=retry_count,
            duration_ms=duration_ms
        )
        self._logs.append(entry)
        
        # Also log to console for debugging
        log_msg = f"[AgentLog] {agent_type.value}/{step}: {status.value}"
        if error:
            log_msg += f" | Error: {entry.error_message}"
        if extra_data:
            log_msg += f" | Meta: {extra_data}"
        logger.info(log_msg)
    
    async def flush(self) -> bool:
        """Send all accumulated logs to backend."""
        if not self._logs:
            return True
        
        try:
            # Convert logs to dicts for JSON serialization
            log_dicts = []
            for log in self._logs:
                log_dict = {
                    "session_id": str(log.session_id),
                    "agent_type": log.agent_type.value,
                    "step": log.step,
                    "status": log.status.value,
                    "student_id": str(log.student_id) if log.student_id else None,
                    "input_data": log.input_data,
                    "output_data": log.output_data,
                    "extra_data": log.extra_data,
                    "error_message": log.error_message,
                    "error_type": log.error_type,
                    "retry_count": log.retry_count,
                    "duration_ms": log.duration_ms,
                }
                log_dicts.append(log_dict)
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_base}/agent/logs/batch",
                    json={"logs": log_dicts},
                    headers={"Authorization": f"Bearer {self.api_token}"} if self.api_token else {},
                    timeout=10.0
                )
                
                if response.status_code in (200, 201):
                    self._logs.clear()
                    return True
                else:
                    logger.error(f"Failed to flush agent logs: {response.status_code}")
                    return False
                    
        except Exception as e:
            logger.error(f"Error flushing agent logs: {e}")
            # Don't clear logs on failure - will retry next time
            return False
    
    def log_started(
        self,
        agent_type: AgentType,
        step: str,
        input_data: dict | None = None,
        extra_data: dict | None = None
    ) -> None:
        """Log step start."""
        self._log(agent_type, step, AgentStatus.STARTED, input_data=input_data, extra_data=extra_data)
    
    def log_success(
        self,
        agent_type: AgentType,
        step: str,
        output_data: dict | None = None,
        extra_data: dict | None = None,
        duration_ms: int | None = None
    ) -> None:
        """Log step success."""
        self._log(agent_type, step, AgentStatus.SUCCESS, output_data=output_data, extra_data=extra_data, duration_ms=duration_ms)
    
    def log_failed(
        self,
        agent_type: AgentType,
        step: str,
        error: Exception,
        retry_count: int = 0
    ) -> None:
        """Log step failure."""
        self._log(agent_type, step, AgentStatus.FAILED, error=error, retry_count=retry_count)
    
    def log_retry(
        self,
        agent_type: AgentType,
        step: str,
        retry_count: int,
        error: Exception | None = None
    ) -> None:
        """Log retry attempt."""
        self._log(agent_type, step, AgentStatus.RETRY, retry_count=retry_count, error=error)
    
    def step(self, step_name: str, agent_type: AgentType):
        """Context manager for logging a step."""
        return _StepContext(self, step_name, agent_type)


class _StepContext:
    """Async context manager for step logging."""
    
    def __init__(self, logger: AgentLogger, step_name: str, agent_type: AgentType):
        self.logger = logger
        self.step_name = step_name
        self.agent_type = agent_type
        self._input_data: dict | None = None
        self._output_data: dict | None = None
        self._extra_data: dict | None = None
        self._start_time: datetime | None = None
    
    async def __aenter__(self):
        self._start_time = datetime.utcnow()
        self.logger.log_started(self.agent_type, self.step_name, self._input_data, self._extra_data)
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        duration = None
        if self._start_time:
            duration = int((datetime.utcnow() - self._start_time).total_seconds() * 1000)
        
        if exc_val:
            self.logger.log_failed(self.agent_type, self.step_name, exc_val)
        else:
            self.logger.log_success(self.agent_type, self.step_name, self._output_data, self._extra_data, duration)
        
        # Don't suppress exception
        return False
    
    def set_input(self, data: dict) -> None:
        """Set input data for logging."""
        self._input_data = data
    
    def set_output(self, data: dict) -> None:
        """Set output data for logging."""
        self._output_data = data
    
    def set_metadata(self, data: dict) -> None:
        """Set extra_data for logging."""
        self._extra_data = data


def create_session_id() -> uuid.UUID:
    """Generate new session ID for agent run."""
    return uuid.uuid4()
