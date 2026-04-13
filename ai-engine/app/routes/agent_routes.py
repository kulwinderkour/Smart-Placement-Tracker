"""
agent_routes.py
---------------
FastAPI router exposing the Smart Placement auto-apply agent.

Endpoints:
  POST /api/agent/auto-apply  — run the full auto-apply workflow
  GET  /api/agent/health      — verify LLM model is reachable and ready
"""

from __future__ import annotations

import asyncio
import logging
import os
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter()
executor = ThreadPoolExecutor(max_workers=3)


# ── Request / Response models ─────────────────────────────────────────────────

class AutoApplyRequest(BaseModel):
    instruction: str = Field(
        ...,
        description="Natural language instruction from the student, e.g. 'Apply to SDE jobs above 10 LPA in Bangalore'",
    )
    student_token: str = Field(
        ...,
        description="Student's JWT bearer token used to authenticate application submissions",
    )
    student_profile: dict[str, Any] = Field(
        ...,
        description="Student profile dict with keys: fullName, college, branch, cgpa, skills, experience",
    )
    resume_url: str = Field(
        default="",
        description="Publicly accessible URL of the student's resume PDF",
    )


class AutoApplyResponse(BaseModel):
    success: bool
    summary: str
    jobs_applied: list[dict[str, Any]]
    jobs_skipped: list[dict[str, Any]]
    total_applied: int
    total_skipped: int


# ── POST /auto-apply ──────────────────────────────────────────────────────────

@router.post(
    "/auto-apply",
    response_model=AutoApplyResponse,
    summary="Run the auto-apply agent",
    description=(
        "Parses the student's instruction, fetches active admin jobs, "
        "scores each job with the ML matcher, generates personalised cover letters "
        "using Gemma, and submits applications — all in one call."
    ),
)
async def auto_apply(request: AutoApplyRequest) -> AutoApplyResponse:
    from app.agent.auto_apply_agent import run_auto_apply_agent
    
    loop = asyncio.get_event_loop()
    try:
        result = await asyncio.wait_for(
            loop.run_in_executor(
                executor,
                lambda: run_auto_apply_agent(
                    instruction=request.instruction,
                    student_token=request.student_token,
                    student_profile=request.student_profile,
                    resume_url=request.resume_url
                )
            ),
            timeout=90.0  # 90 second hard limit
        )
        return AutoApplyResponse(
            success=result.get("success", True),
            summary=result.get("summary", ""),
            jobs_applied=result.get("jobs_applied", []),
            jobs_skipped=result.get("jobs_skipped", []),
            total_applied=result.get("total_applied", 0),
            total_skipped=result.get("total_skipped", 0),
        )
    except asyncio.TimeoutError:
        return AutoApplyResponse(
            success=False,
            summary="Agent took too long to respond. The backend may be slow. Please try again with fewer jobs or a higher minimum package filter.",
            jobs_applied=[],
            jobs_skipped=[],
            total_applied=0,
            total_skipped=0
        )
    except Exception as e:
        return AutoApplyResponse(
            success=False,
            summary=f"Agent encountered an error: {str(e)}",
            jobs_applied=[],
            jobs_skipped=[],
            total_applied=0,
            total_skipped=0
        )


# ── GET /health ───────────────────────────────────────────────────────────────

@router.get(
    "/health",
    summary="Agent health check",
    description="Returns the configured LLM model name and whether the agent module is importable. Use this before showing the auto-apply button in the frontend.",
)
async def agent_health() -> dict[str, Any]:
    model_name = os.environ.get("GEMMA_MODEL", "gemma-3-27b-it")
    api_key_set = bool(
        os.environ.get("GOOGLE_AI_API_KEY") or os.environ.get("GEMINI_API_KEY")
    )

    try:
        # Confirm agent module is importable (no side-effects / heavy loads).
        from app.agent.auto_apply_agent import run_auto_apply_agent  # noqa: F401
        agent_ready = True
        tool_names: list[str] = []
    except Exception as exc:
        logger.warning("Agent module not ready: %s", exc)
        agent_ready = False
        tool_names = []

    return {
        "status": "ready" if (agent_ready and api_key_set) else "unavailable",
        "agent_ready": agent_ready,
        "model": model_name,
        "api_key_configured": api_key_set,
        "tools": tool_names,
    }


# ── Thread helper (agent executor is sync) ────────────────────────────────────

async def _run_in_thread(fn, **kwargs) -> Any:
    """Run a synchronous blocking function in a thread pool to avoid blocking the event loop."""
    import asyncio
    import functools
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, functools.partial(fn, **kwargs))
