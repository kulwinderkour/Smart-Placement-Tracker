"""
Agent Logs API

Endpoints for querying and managing agent execution logs.
Used by:
- Frontend to show agent run history to students
- Admin dashboard to debug agent decisions
- Analytics for agent performance
"""

from uuid import UUID
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
from app.models.agent_log import AgentLog, AgentType, AgentStatus
from app.models.user import User, UserRole

router = APIRouter(prefix="/agent", tags=["agent_logs"])


# ── Request/Response Schemas ─────────────────────────────────────────────────

class AgentLogCreate:
    session_id: UUID
    agent_type: str
    step: str
    status: str
    input_data: dict | None = None
    output_data: dict | None = None
    extra_data: dict | None = None
    error_message: str | None = None
    error_type: str | None = None
    retry_count: int = 0
    duration_ms: int | None = None


class BatchLogRequest:
    logs: list[dict[str, Any]]


# ── Endpoints ───────────────────────────────────────────────────────────────

@router.post("/logs/batch", response_model=dict)
async def create_agent_logs_batch(
    request: dict,  # BatchLogRequest
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create multiple agent log entries (called by AI engine).
    
    Internal endpoint - requires authentication.
    """
    logs = request.get("logs", [])
    if not logs:
        return {"created": 0}
    
    created_count = 0
    
    for log_data in logs:
        try:
            # Map string values to enums
            agent_type_str = log_data.get("agent_type", "auto_apply")
            status_str = log_data.get("status", "started")
            
            try:
                agent_type = AgentType(agent_type_str)
            except ValueError:
                agent_type = AgentType.auto_apply
            
            try:
                status = AgentStatus(status_str)
            except ValueError:
                status = AgentStatus.started
            
            # Parse student_id if present
            student_id = None
            if log_data.get("student_id"):
                try:
                    student_id = UUID(log_data["student_id"])
                except ValueError:
                    pass
            
            # Create log entry
            log = AgentLog(
                session_id=UUID(log_data["session_id"]),
                agent_type=agent_type,
                step=log_data.get("step", "unknown"),
                status=status,
                student_id=student_id,
                input_data=log_data.get("input_data"),
                output_data=log_data.get("output_data"),
                extra_data=log_data.get("extra_data") or log_data.get("metadata"),
                error_message=log_data.get("error_message"),
                error_type=log_data.get("error_type"),
                retry_count=log_data.get("retry_count", 0),
                duration_ms=log_data.get("duration_ms"),
            )
            
            db.add(log)
            created_count += 1
            
        except Exception as e:
            # Log error but don't fail entire batch
            print(f"Failed to create agent log: {e}")
            continue
    
    await db.commit()
    
    return {"created": created_count}


@router.get("/logs/my", response_model=list[dict])
async def get_my_agent_logs(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    agent_type: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get current student's agent execution logs.
    
    Shows history of auto-apply runs and their outcomes.
    """
    # Get student ID from user
    from app.models.student import Student
    
    result = await db.execute(
        select(Student.id).where(Student.user_id == current_user.id)
    )
    student_id = result.scalar_one_or_none()
    
    if not student_id:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    # Build query
    query = select(AgentLog).where(AgentLog.student_id == student_id)
    
    if agent_type:
        try:
            at = AgentType(agent_type)
            query = query.where(AgentLog.agent_type == at)
        except ValueError:
            pass
    
    # Order by newest first
    query = query.order_by(desc(AgentLog.created_at))
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    logs = result.scalars().all()
    
    return [_serialize_log(log) for log in logs]


@router.get("/logs/session/{session_id}", response_model=list[dict])
async def get_session_logs(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all logs for a specific agent session.
    
    Shows step-by-step execution for debugging.
    """
    # Check if user owns this session or is admin
    from app.models.student import Student
    
    result = await db.execute(
        select(AgentLog.student_id)
        .where(AgentLog.session_id == session_id)
        .limit(1)
    )
    session_student_id = result.scalar_one_or_none()
    
    if not session_student_id:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get current user's student ID
    result = await db.execute(
        select(Student.id).where(Student.user_id == current_user.id)
    )
    user_student_id = result.scalar_one_or_none()
    
    # Allow if own session or admin
    is_admin = current_user.role == UserRole.admin
    if session_student_id != user_student_id and not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to view this session")
    
    # Fetch logs
    result = await db.execute(
        select(AgentLog)
        .where(AgentLog.session_id == session_id)
        .order_by(AgentLog.created_at)
    )
    logs = result.scalars().all()
    
    return [_serialize_log(log) for log in logs]


@router.get("/admin/logs", response_model=dict)
async def get_all_agent_logs(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    agent_type: str | None = None,
    status: str | None = None,
    student_id: UUID | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = select(AgentLog)
    
    # Apply filters
    if agent_type:
        try:
            at = AgentType(agent_type)
            query = query.where(AgentLog.agent_type == at)
        except ValueError:
            pass
    
    if status:
        try:
            st = AgentStatus(status)
            query = query.where(AgentLog.status == st)
        except ValueError:
            pass
    
    if student_id:
        query = query.where(AgentLog.student_id == student_id)
    
    if date_from:
        query = query.where(AgentLog.created_at >= date_from)
    
    if date_to:
        query = query.where(AgentLog.created_at <= date_to)
    
    # Get total count
    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()
    
    # Get paginated results
    query = query.order_by(desc(AgentLog.created_at))
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    logs = result.scalars().all()
    
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "logs": [_serialize_log(log) for log in logs]
    }


@router.get("/admin/stats", response_model=dict)
async def get_agent_stats(
    days: int = Query(7, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    since = datetime.utcnow() - timedelta(days=days)
    
    # Total runs
    result = await db.execute(
        select(func.count(func.distinct(AgentLog.session_id)))
        .where(AgentLog.created_at >= since)
    )
    total_sessions = result.scalar()
    
    # By agent type
    result = await db.execute(
        select(AgentLog.agent_type, func.count())
        .where(AgentLog.created_at >= since)
        .group_by(AgentLog.agent_type)
    )
    by_type = {at.value: ct for at, ct in result.all()}
    
    # By status
    result = await db.execute(
        select(AgentLog.status, func.count())
        .where(AgentLog.created_at >= since)
        .group_by(AgentLog.status)
    )
    by_status = {st.value: ct for st, ct in result.all()}
    
    # Average duration
    result = await db.execute(
        select(func.avg(AgentLog.duration_ms))
        .where(AgentLog.created_at >= since)
        .where(AgentLog.duration_ms.isnot(None))
    )
    avg_duration = result.scalar()
    
    # Error rate
    result = await db.execute(
        select(func.count())
        .where(AgentLog.created_at >= since)
        .where(AgentLog.status == AgentStatus.failed)
    )
    error_count = result.scalar()
    
    error_rate = (error_count / total_sessions * 100) if total_sessions > 0 else 0
    
    return {
        "period_days": days,
        "total_sessions": total_sessions,
        "by_agent_type": by_type,
        "by_status": by_status,
        "avg_duration_ms": round(avg_duration) if avg_duration else None,
        "error_count": error_count,
        "error_rate_percent": round(error_rate, 2)
    }


# ── Helpers ─────────────────────────────────────────────────────────────────

def _serialize_log(log: AgentLog) -> dict:
    """Serialize agent log to dict."""
    return {
        "id": str(log.id),
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
        "created_at": log.created_at.isoformat() if log.created_at else None,
    }
