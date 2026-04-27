"""
agent_routes.py
---------------
FastAPI router for the Smart Placement LLM-first Agent.

Architecture:
    User Input
    → BrainAgent.classify()          ← Gemini 2.5 Flash — ALWAYS runs first
    → BrainDecision (intent/action)
    → Dispatcher routes to correct executor:
        greeting / general_query  → conversational reply only
        job_search                → fetch + filter jobs, return list
        job_apply                 → full autonomous apply pipeline
        resume_update             → resume extraction agent
        profile_query             → profile data fetch

RULE: auto-apply pipeline is NEVER triggered unless intent == job_apply.
RULE: predict() model is untouched.

Endpoints:
  POST /api/agent/auto-apply   — LLM-routed smart endpoint
  POST /api/agent/validate-job — validate a job before publishing
  GET  /api/agent/health       — Gemini + brain agent health check
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
        description="Natural language instruction — English, Hindi, or Hinglish",
    )
    student_token: str = Field(
        ...,
        description="Student's JWT bearer token",
    )
    student_profile: dict[str, Any] = Field(
        ...,
        description="Student profile dict with keys: fullName, college, branch, cgpa, skills",
    )
    resume_url: str = Field(
        default="",
        description="Publicly accessible URL of the student's resume PDF",
    )
    use_new_pipeline: bool = Field(
        default=True,
        description="Use the new autonomous pipeline (true) or legacy pipeline (false)",
    )


class AutoApplyResponse(BaseModel):
    success: bool
    summary: str
    jobs_applied: list[dict[str, Any]]
    jobs_skipped: list[dict[str, Any]]
    total_applied: int
    total_skipped: int
    session_id: str | None = None
    pipeline_used: str = "legacy"
    # Brain agent fields — always present
    intent: str = "unknown"
    action: str = "fallback_reply"
    brain_reply: str = ""          # conversational reply from Gemini brain
    needs_confirmation: bool = False  # True → frontend must ask user to confirm


class JobValidateRequest(BaseModel):
    job_data: dict[str, Any] = Field(..., description="Job data to validate")


class JobValidateResponse(BaseModel):
    is_valid: bool
    can_publish: bool
    quality_score: float
    issues: list[dict[str, Any]]
    extracted_skills: list[str]


# ── POST /auto-apply ──────────────────────────────────────────────────────────

@router.post(
    "/auto-apply",
    response_model=AutoApplyResponse,
    summary="LLM-routed Smart Placement Agent",
    description=(
        "Brain Agent classifies the input first. "
        "Only job_apply intent triggers the apply pipeline. "
        "Greetings, searches, and queries get conversational replies. "
        "Handles English / Hindi / Hinglish."
    ),
)
async def auto_apply(request: AutoApplyRequest) -> AutoApplyResponse:
    from app.agents.brain_agent import Action, Intent, get_brain_agent
    from app.core.session_store import append_history, load_history

    # ── Step 1: Load conversation history for context ─────────────────────────
    history = await load_history(request.student_token, request.student_profile)
    logger.debug("[Route] Loaded %d history entries for context", len(history))

    # ── Step 2: Brain Agent classifies intent (with history) ──────────────────
    brain = get_brain_agent()
    try:
        decision = await asyncio.wait_for(
            brain.classify(request.instruction, conversation_history=history),
            timeout=15.0,
        )
    except asyncio.TimeoutError:
        logger.warning("[Brain] Classification timed out, defaulting to general_query")
        from app.agents.brain_agent import BrainDecision
        decision = BrainDecision(
            intent=Intent.GENERAL_QUERY,
            action=Action.REPLY_ONLY,
            entities={},
            reply="Sorry, I'm a bit slow right now. Can you try again?",
            confidence=0.0,
            parsed_by="timeout_fallback",
            raw_instruction=request.instruction,
        )

    logger.info(
        "[Route] intent=%s action=%s needs_confirmation=%s history_turns=%d instruction=%r",
        decision.intent.value,
        decision.action.value,
        decision.needs_confirmation,
        len(history) // 2,
        request.instruction[:80],
    )

    # ── Step 3: Dispatch based on action ──────────────────────────────────────

    if decision.action == Action.REPLY_ONLY:
        response = AutoApplyResponse(
            success=True,
            summary=decision.reply,
            jobs_applied=[],
            jobs_skipped=[],
            total_applied=0,
            total_skipped=0,
            pipeline_used="brain_reply",
            intent=decision.intent.value,
            action=decision.action.value,
            brain_reply=decision.reply,
        )

    elif decision.action == Action.SEARCH_JOBS:
        response = await _handle_job_search(request, decision)

    elif decision.action == Action.APPLY_JOBS:
        # ── Check if this is a "yes" answer to a pending confirmation ──────────
        from app.core.session_store import load_pending
        pending = await load_pending(
            request.student_token,
            request.student_profile,
            expected_action="apply_jobs",
        )
        if pending:
            yes_words = {"yes", "haan", "ha", "confirm", "ok", "okay", "sure", "apply"}
            instr_lower = request.instruction.lower().strip()
            if any(w in instr_lower.split() for w in yes_words):
                response = await _handle_confirmed_apply(request, decision, pending)
            else:
                # No-match: treat as fresh apply intent (they typed something else)
                response = await _handle_job_apply(request, decision)
        elif decision.needs_confirmation:
            response = await _handle_apply_confirmation(request, decision)
        else:
            response = await _handle_job_apply(request, decision)

    elif decision.action == Action.QUERY_MEMORY:
        from app.core.session_store import load_applications, load_traces
        applications = await load_applications(request.student_token, request.student_profile)
        traces = await load_traces(request.student_token, request.student_profile)
        memory_answer = await brain.answer_from_memory(
            request.instruction, applications, traces
        )
        response = AutoApplyResponse(
            success=True,
            summary=memory_answer,
            jobs_applied=[],
            jobs_skipped=[],
            total_applied=0,
            total_skipped=0,
            pipeline_used="memory_query",
            intent=decision.intent.value,
            action=decision.action.value,
            brain_reply=memory_answer,
        )

    elif decision.action == Action.FETCH_PROFILE:
        response = AutoApplyResponse(
            success=True,
            summary=_build_profile_summary(request.student_profile),
            jobs_applied=[],
            jobs_skipped=[],
            total_applied=0,
            total_skipped=0,
            pipeline_used="profile_query",
            intent=decision.intent.value,
            action=decision.action.value,
            brain_reply=decision.reply,
        )

    elif decision.action == Action.EXTRACT_RESUME:
        response = await _handle_resume_extract(request, decision)

    else:
        # fallback_reply / unknown
        response = AutoApplyResponse(
            success=True,
            summary=decision.reply,
            jobs_applied=[],
            jobs_skipped=[],
            total_applied=0,
            total_skipped=0,
            pipeline_used="fallback_reply",
            intent=decision.intent.value,
            action=decision.action.value,
            brain_reply=decision.reply,
        )

    # ── Step 4: Persist exchange to conversation history (fire-and-forget) ────
    try:
        agent_reply_text = response.brain_reply or response.summary or ""
        _meta = {
            "tool_used":        response.pipeline_used,
            "filters_used":     decision.entities if hasattr(decision, "entities") else {},
            "jobs_count":       response.total_applied + response.total_skipped,
            "execution_status": "success" if response.success else "failed",
        }
        if response.pipeline_used == "awaiting_confirmation":
            _meta["execution_status"] = "awaiting_confirmation"
        await append_history(
            request.student_token,
            user_message=request.instruction,
            agent_reply=agent_reply_text[:500],
            intent=decision.intent.value,
            student_profile=request.student_profile,
            metadata=_meta,
        )
    except Exception as _hist_err:
        logger.debug("[Route] History append failed (non-fatal): %s", _hist_err)

    return response


# ── Helpers: filter jobs list ────────────────────────────────────────────────

def _filter_jobs(jobs: list, entities: dict) -> list:
    """Apply salary + role filter to a raw job list. Shared by search and apply."""
    from app.agents.auto_apply_pipeline import _to_lpa
    min_lpa = float(entities.get("salary_min_lpa") or 0)
    max_lpa = float(entities.get("salary_max_lpa") or 0)
    role = (entities.get("role") or "").lower()

    filtered = []
    for job in jobs:
        job_max = _to_lpa(job.get("salary_max") or job.get("package_max"))
        job_min = _to_lpa(job.get("salary_min") or job.get("package_min"))
        if job_max == 0.0 and job_min > 0.0:
            job_max = job_min
        if min_lpa > 0 and job_max > 0 and job_max < min_lpa:
            continue
        if max_lpa > 0 and job_min > max_lpa:
            continue
        if role:
            title = (job.get("role_title") or job.get("title") or "").lower()
            desc = (job.get("description") or "").lower()
            if role not in title and role not in desc:
                continue
        filtered.append(job)
    return filtered


# ── Dispatcher: resume extraction + profile sync ─────────────────────────────

async def _handle_resume_extract(request: AutoApplyRequest, decision) -> AutoApplyResponse:
    """Fetch latest resume, run Gemini extraction, PATCH profile to DB."""
    from app.agents.auto_apply_pipeline import AutoApplyPipeline

    pipeline = AutoApplyPipeline(
        student_token=request.student_token,
        student_profile=request.student_profile,
        resume_url=request.resume_url,
    )

    resume_text, file_bytes = await pipeline._fetch_resume_text(request.resume_url)
    if not resume_text:
        reply = "I couldn't fetch your resume right now. Please make sure you've uploaded a resume from your Profile page."
        return AutoApplyResponse(
            success=False,
            summary=reply,
            jobs_applied=[],
            jobs_skipped=[],
            total_applied=0,
            total_skipped=0,
            pipeline_used="resume_update",
            intent=decision.intent.value,
            action=decision.action.value,
            brain_reply=reply,
        )

    extraction = await pipeline.resume_agent.extract(resume_text)
    synced = await pipeline._sync_profile_to_backend(extraction, file_bytes=file_bytes)

    skills = extraction.normalized_skills or extraction.skills or []
    if synced and skills:
        reply = (
            f"I've re-analysed your resume and updated your profile. "
            f"Skills now on record: {', '.join(skills[:15])}"
            + (" (and more)" if len(skills) > 15 else "") + "."
        )
    elif skills:
        reply = (
            f"I extracted your skills ({', '.join(skills[:15])}"
            + (" and more" if len(skills) > 15 else "")
            + ") but couldn't save them right now. Try again shortly."
        )
    else:
        reply = "I processed your resume but couldn't detect any skills. Make sure your resume is clearly formatted."

    return AutoApplyResponse(
        success=synced,
        summary=reply,
        jobs_applied=[],
        jobs_skipped=[],
        total_applied=0,
        total_skipped=0,
        pipeline_used="resume_update",
        intent=decision.intent.value,
        action=decision.action.value,
        brain_reply=reply,
    )


# ── Dispatcher: job search (no applications) ─────────────────────────────────

async def _handle_job_search(request: AutoApplyRequest, decision) -> AutoApplyResponse:
    """Fetch and filter jobs — never applies. Saves results to session cache."""
    from app.agents.auto_apply_pipeline import AutoApplyPipeline, _to_lpa
    from app.core.session_store import save_search, clear_pending

    try:
        pipeline = AutoApplyPipeline(
            student_token=request.student_token,
            student_profile=request.student_profile,
            resume_url=request.resume_url,
        )
        jobs = await asyncio.wait_for(pipeline._fetch_jobs(), timeout=15.0)

        entities = decision.entities or {}
        filtered = _filter_jobs(jobs, entities)

        # ── Save to session cache so a follow-up apply can reuse these results
        filters_to_save = {
            "salary_min_lpa": entities.get("salary_min_lpa"),
            "salary_max_lpa": entities.get("salary_max_lpa"),
            "role": entities.get("role"),
        }
        await save_search(
            request.student_token,
            filtered,
            filters_to_save,
            student_profile=request.student_profile,
        )
        # New search invalidates any prior pending confirmation
        await clear_pending(request.student_token, request.student_profile)
        logger.info("[Search] Cached %d jobs for session", len(filtered))

        if not filtered:
            min_lpa = float(entities.get("salary_min_lpa") or 0)
            role = (entities.get("role") or "").lower()
            summary = f"No jobs found matching your criteria (min {min_lpa}LPA, role: {role or 'any'})."
        else:
            lines = [f"Found {len(filtered)} matching job(s):"]
            for j in filtered[:10]:
                title = j.get("role_title") or j.get("title", "Unknown")
                company = j.get("company_name") or j.get("company", "Unknown")
                jmax = _to_lpa(j.get("salary_max") or j.get("package_max"))
                pkg = f" — up to {jmax}LPA" if jmax > 0 else ""
                lines.append(f"  \u2022 {title} @ {company}{pkg}")
            if len(filtered) > 10:
                lines.append(f"  ... and {len(filtered) - 10} more")
            lines.append("\nSay 'apply to these jobs' to submit applications.")
            summary = "\n".join(lines)

        return AutoApplyResponse(
            success=True,
            summary=summary,
            jobs_applied=[],
            jobs_skipped=[
                {
                    "job_id": j.get("id"),
                    "title": j.get("role_title") or j.get("title"),
                    "company": j.get("company_name") or j.get("company"),
                    "salary_max_lpa": _to_lpa(j.get("salary_max") or j.get("package_max")),
                }
                for j in filtered
            ],
            total_applied=0,
            total_skipped=len(filtered),
            pipeline_used="job_search",
            intent=decision.intent.value,
            action=decision.action.value,
            brain_reply=decision.reply,
        )

    except asyncio.TimeoutError:
        return AutoApplyResponse(
            success=False,
            summary="Job search timed out. Please try again.",
            jobs_applied=[], jobs_skipped=[],
            total_applied=0, total_skipped=0,
            pipeline_used="job_search",
            intent=decision.intent.value,
            action=decision.action.value,
            brain_reply=decision.reply,
        )
    except Exception as e:
        logger.exception("[Search] Error: %s", e)
        return AutoApplyResponse(
            success=False,
            summary=f"Search error: {str(e)[:200]}",
            jobs_applied=[], jobs_skipped=[],
            total_applied=0, total_skipped=0,
            pipeline_used="job_search",
            intent=decision.intent.value,
            action=decision.action.value,
            brain_reply=decision.reply,
        )


# ── Dispatcher: confirmation gate (risky blanket apply) ───────────────────────

async def _handle_apply_confirmation(request: AutoApplyRequest, decision) -> AutoApplyResponse:
    """
    User said 'apply all' or similar blanket phrase.
    Fetch (or reuse cached) jobs, save pending state in Redis, ask confirmation.
    Does NOT trigger the pipeline — that only happens after user confirms.
    """
    from app.agents.auto_apply_pipeline import AutoApplyPipeline, _to_lpa
    from app.core.session_store import load_search, save_pending

    try:
        cached_jobs, cached_filters = await load_search(
            request.student_token, request.student_profile
        )
        entities = decision.entities or {}

        if cached_jobs is not None:
            filtered = cached_jobs
            filters_used = cached_filters or entities
            logger.info("[Confirm] Using %d cached jobs", len(filtered))
        else:
            pipeline = AutoApplyPipeline(
                student_token=request.student_token,
                student_profile=request.student_profile,
                resume_url=request.resume_url,
            )
            raw_jobs = await asyncio.wait_for(pipeline._fetch_jobs(), timeout=15.0)
            filtered = _filter_jobs(raw_jobs, entities)
            filters_used = entities

        # ── Persist pending state server-side (survives page refresh) ──────────
        await save_pending(
            request.student_token,
            filtered,
            filters_used,
            action="apply_jobs",
            student_profile=request.student_profile,
        )

        count = len(filtered)
        if count == 0:
            reply = "No matching jobs found. Nothing to apply to."
        else:
            lines = [f"Found {count} matching job(s). Reply **yes** to apply to all, or **no** to cancel:\n"]
            for j in filtered[:8]:
                title = j.get("role_title") or j.get("title", "Unknown")
                company = j.get("company_name") or j.get("company", "Unknown")
                jmax = _to_lpa(j.get("salary_max") or j.get("package_max"))
                pkg = f" — up to {jmax}LPA" if jmax > 0 else ""
                lines.append(f"  \u2022 {title} @ {company}{pkg}")
            if count > 8:
                lines.append(f"  ... and {count - 8} more")
            reply = "\n".join(lines)

        return AutoApplyResponse(
            success=True,
            summary=reply,
            jobs_applied=[],
            jobs_skipped=[],
            total_applied=0,
            total_skipped=count,
            pipeline_used="awaiting_confirmation",
            intent=decision.intent.value,
            action=decision.action.value,
            brain_reply=reply,
            needs_confirmation=True,
        )

    except Exception as e:
        logger.exception("[Confirm] Error: %s", e)
        return AutoApplyResponse(
            success=False,
            summary=f"Could not fetch jobs: {str(e)[:200]}",
            jobs_applied=[], jobs_skipped=[],
            total_applied=0, total_skipped=0,
            pipeline_used="awaiting_confirmation",
            intent=decision.intent.value,
            action=decision.action.value,
            brain_reply=decision.reply,
            needs_confirmation=True,
        )


# ── Dispatcher: execute confirmed apply from pending state ────────────────────

async def _handle_confirmed_apply(
    request: AutoApplyRequest, decision, pending: dict
) -> AutoApplyResponse:
    """
    User said 'yes' after a confirmation prompt.
    Load the pending jobs from Redis and run the apply pipeline.

    Confirmation lock: pending is cleared *before* the pipeline runs so that
    a second concurrent 'yes' cannot re-trigger the same apply batch.
    """
    from app.core.session_store import (
        clear_pending, clear_search, filter_unapplied_jobs, record_applied_jobs,
    )

    cached_jobs = pending.get("jobs") or []
    logger.info("[Confirm] User confirmed — %d pending jobs", len(cached_jobs))

    # ── Confirmation lock: clear pending immediately so repeated 'yes' is a no-op
    await clear_pending(request.student_token, request.student_profile)

    # ── Dedup: remove jobs already applied to in a previous session
    unapplied, duplicates = await filter_unapplied_jobs(
        request.student_token, cached_jobs, request.student_profile
    )
    if duplicates:
        logger.info(
            "[Confirm] Skipping %d duplicate job(s): %s",
            len(duplicates),
            [str(j.get('id') or j.get('job_id')) for j in duplicates],
        )
    if not unapplied:
        await clear_search(request.student_token, request.student_profile)
        return AutoApplyResponse(
            success=True,
            summary=f"All {len(duplicates)} job(s) were already applied to in a previous session. Nothing new to submit.",
            jobs_applied=[], jobs_skipped=[
                {"job_id": str(j.get("id") or j.get("job_id")),
                 "reason": "already applied"} for j in duplicates
            ],
            total_applied=0, total_skipped=len(duplicates),
            pipeline_used="dedup_skip",
            intent=decision.intent.value,
            action=decision.action.value,
            brain_reply="You have already applied to all matching jobs.",
        )

    # ── Emit confirmation_check trace
    from app.core.session_store import append_trace
    await append_trace(
        request.student_token, "confirmation_check", "success",
        detail=f"confirmed: {len(unapplied)} unapplied, {len(duplicates)} duplicates skipped",
        student_profile=request.student_profile,
    )

    # ── Run pipeline with deduplicated jobs
    resp = await _run_new_pipeline(request, decision, prefetched_jobs=unapplied)

    # ── Record full application state for every job (success + failure + skip)
    if resp.success or resp.jobs_applied or resp.jobs_skipped:
        all_records = [
            {
                "job_id":         str(a.get("job_id", "")),
                "status":         "applied",
                "application_id": str(a.get("application_id") or ""),
                "reason":         "",
                "match_score":    float(a.get("match_score") or 0),
                "job_title":      str(a.get("title") or ""),
                "company":        str(a.get("company") or ""),
            }
            for a in (resp.jobs_applied or [])
        ] + [
            {
                "job_id":         str(s.get("job_id", "")),
                "status":         "skipped",
                "application_id": "",
                "reason":         str(s.get("reason") or "did not meet criteria"),
                "match_score":    0.0,
                "job_title":      str(s.get("title") or ""),
                "company":        str(s.get("company") or ""),
            }
            for s in (resp.jobs_skipped or [])
        ] + [
            {
                "job_id":         str(j.get("id") or j.get("job_id", "")),
                "status":         "duplicate",
                "application_id": "",
                "reason":         "already applied in a previous session",
                "match_score":    0.0,
                "job_title":      str(j.get("role_title") or j.get("title") or ""),
                "company":        str(j.get("company_name") or j.get("company") or ""),
            }
            for j in duplicates
        ]
        await record_applied_jobs(
            request.student_token,
            all_records,
            request.student_profile,
        )

    await clear_search(request.student_token, request.student_profile)
    return resp


# ── Dispatcher: job apply (full autonomous pipeline) ─────────────────────────

async def _handle_job_apply(request: AutoApplyRequest, decision) -> AutoApplyResponse:
    """Run the full autonomous apply pipeline. Only called for intent=job_apply."""
    if request.use_new_pipeline:
        return await _run_new_pipeline(request, decision)
    return await _run_legacy_pipeline(request, decision)


_PRONOUN_APPLY_PATTERNS = {
    "them", "those", "these", "these jobs", "those jobs",
    "that one", "this one", "this job", "that job",
    "apply in them", "apply to them", "apply for them",
    "apply to those", "apply to these", "apply for those", "apply for these",
    "unhe", "inhe", "wahi", "inko", "unko",
}


def _is_pronoun_apply(instruction: str) -> bool:
    """True when the instruction is a pronoun reference with no new job criteria."""
    text = instruction.lower().strip()
    if text in _PRONOUN_APPLY_PATTERNS:
        return True
    # Short phrase that is only pronouns + apply verb, no role/salary keywords
    has_pronoun = any(p in text for p in ("them", "those", "these", "that one", "this job", "this one"))
    has_new_criteria = any(k in text for k in (
        "lpa", "salary", "role", "sde", "data", "manager", "analyst", "engineer",
        "intern", "full time", "remote", "location",
    ))
    return has_pronoun and not has_new_criteria


async def _run_new_pipeline(
    request: AutoApplyRequest,
    decision=None,
    prefetched_jobs: list | None = None,
) -> AutoApplyResponse:
    from app.agents.auto_apply_pipeline import run_pipeline
    from app.core.session_store import clear_search, load_search

    pronoun_ref = _is_pronoun_apply(request.instruction)

    # ── Use caller-supplied jobs (from pending state) or load from search cache ──
    from_cache = False
    if prefetched_jobs is not None:
        cached_jobs = prefetched_jobs
        from_cache = True
        logger.info("[Apply] cache_loaded=caller_supplied jobs=%d", len(cached_jobs))
    else:
        cached_jobs, _ = await load_search(request.student_token, request.student_profile)
        if cached_jobs is not None:
            from_cache = True
            logger.info(
                "[Apply] cache_loaded=redis jobs_loaded_from_cache=%d pronoun_resolved=%s",
                len(cached_jobs), pronoun_ref,
            )
        else:
            logger.info("[Apply] cache_loaded=miss pronoun_resolved=%s — pipeline will fetch fresh", pronoun_ref)
            if pronoun_ref:
                reply = (
                    "I don't have a recent job search in memory. "
                    "Please search first (e.g. 'show SDE jobs above 8 LPA') and then say 'apply to them'."
                )
                return AutoApplyResponse(
                    success=False,
                    summary=reply,
                    jobs_applied=[], jobs_skipped=[],
                    total_applied=0, total_skipped=0,
                    pipeline_used="pronoun_no_cache",
                    intent=decision.intent.value if decision else "job_apply",
                    action="apply_jobs",
                    brain_reply=reply,
                )

    # ── Role-title filter on cached jobs ──
    # Skip entirely for pronoun references — user means the cached list as-is
    if from_cache and cached_jobs and decision is not None and not pronoun_ref:
        entities = decision.entities or {}
        role = (entities.get("role") or "").lower().strip()
        if role:
            before = len(cached_jobs)
            cached_jobs = [
                j for j in cached_jobs
                if role in (j.get("role_title") or j.get("title") or "").lower()
                or role in (j.get("description") or "").lower()
            ]
            logger.info("[Apply] Role filter '%s': %d → %d jobs", role, before, len(cached_jobs))
            if not cached_jobs:
                from_cache = False
                cached_jobs = None
                logger.info("[Apply] No cached jobs match role '%s' — pipeline will fetch fresh", role)

    if from_cache and cached_jobs:
        logger.info("[Apply] apply_target_count=%d source=%s", len(cached_jobs), "cache")

    try:
        result = await asyncio.wait_for(
            run_pipeline(
                instruction=request.instruction,
                student_token=request.student_token,
                student_profile=request.student_profile,
                resume_url=request.resume_url,
                prefetched_jobs=cached_jobs,
                skip_salary_filter=from_cache,
            ),
            timeout=120.0,
        )

        applied_apps = [a for a in result.applications if a.status == "applied"]
        skipped_apps = [a for a in result.applications if a.status in ("skipped", "failed")]

        # ── Invalidate session cache — run is complete ──────────────────
        await clear_search(request.student_token, request.student_profile)

        return AutoApplyResponse(
            success=result.success,
            summary=result.summary,
            jobs_applied=[
                {
                    "job_id": a.job_id,
                    "application_id": a.application_id or "",
                    "title": a.job_title,
                    "company": a.company,
                    "match_score": a.match_score,
                    "description": a.cover_letter[:300] if a.cover_letter else "",
                    "result": "Application submitted successfully.",
                }
                for a in applied_apps
            ],
            jobs_skipped=[
                {
                    "job_id": a.job_id,
                    "title": a.job_title,
                    "company": a.company,
                    "reason": a.filter_reason or a.reason or "Did not meet criteria",
                }
                for a in skipped_apps
            ],
            total_applied=result.total_applied,
            total_skipped=result.total_skipped,
            session_id=result.session_id,
            pipeline_used="autonomous_v2",
            intent=decision.intent.value if decision else "job_apply",
            action="apply_jobs",
            brain_reply=decision.reply if decision else "",
        )

    except asyncio.TimeoutError:
        return AutoApplyResponse(
            success=False,
            summary="Agent timed out. Try a more specific instruction (e.g. 'Apply to SDE jobs above 10 LPA').",
            jobs_applied=[], jobs_skipped=[],
            total_applied=0, total_skipped=0,
            pipeline_used="autonomous_v2",
            intent=decision.intent.value if decision else "job_apply",
            action="apply_jobs",
            brain_reply="",
        )
    except Exception as e:
        logger.exception("New pipeline error: %s", e)
        return await _run_legacy_pipeline(request, decision)


async def _run_legacy_pipeline(request: AutoApplyRequest, decision=None) -> AutoApplyResponse:
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
                    resume_url=request.resume_url,
                ),
            ),
            timeout=90.0,
        )
        return AutoApplyResponse(
            success=result.get("success", True),
            summary=result.get("summary", ""),
            jobs_applied=result.get("jobs_applied", []),
            jobs_skipped=result.get("jobs_skipped", []),
            total_applied=result.get("total_applied", 0),
            total_skipped=result.get("total_skipped", 0),
            pipeline_used="legacy",
            intent=decision.intent.value if decision else "job_apply",
            action="apply_jobs",
            brain_reply="",
        )
    except asyncio.TimeoutError:
        return AutoApplyResponse(
            success=False,
            summary="Agent took too long. Try with a higher minimum package filter.",
            jobs_applied=[], jobs_skipped=[],
            total_applied=0, total_skipped=0,
            pipeline_used="legacy",
            intent=decision.intent.value if decision else "job_apply",
            action="apply_jobs",
            brain_reply="",
        )
    except Exception as e:
        return AutoApplyResponse(
            success=False,
            summary=f"Agent error: {str(e)}",
            jobs_applied=[], jobs_skipped=[],
            total_applied=0, total_skipped=0,
            pipeline_used="legacy",
            intent=decision.intent.value if decision else "job_apply",
            action="apply_jobs",
            brain_reply="",
        )


# ── POST /validate-job ────────────────────────────────────────────────────────

@router.post(
    "/validate-job",
    response_model=JobValidateResponse,
    summary="Validate a job posting before publishing",
    description="Checks completeness, quality, and rejects incomplete jobs.",
)
async def validate_job(request: JobValidateRequest) -> JobValidateResponse:
    from app.agents.validation_agent import validate_job as _validate

    try:
        result = await asyncio.wait_for(
            _validate(request.job_data),
            timeout=30.0,
        )
        return JobValidateResponse(
            is_valid=result.is_valid,
            can_publish=result.can_publish,
            quality_score=result.quality_score,
            issues=[
                {
                    "field": issue.field,
                    "severity": issue.severity,
                    "message": issue.message,
                    "suggestion": issue.suggestion,
                }
                for issue in result.issues
            ],
            extracted_skills=result.extracted_skills,
        )
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Validation timed out")
    except Exception as e:
        logger.exception("Validation error: %s", e)
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")


# ── GET /health ───────────────────────────────────────────────────────────────

@router.get(
    "/health",
    summary="Agent health check",
    description="Checks Gemini API availability, Brain Agent, and pipeline readiness.",
)
async def agent_health() -> dict[str, Any]:
    api_key_set = bool(
        os.environ.get("GOOGLE_AI_API_KEY") or os.environ.get("GEMINI_API_KEY")
    )
    model_name = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

    gemini_status: dict[str, Any] = {"healthy": False, "latency_ms": None, "error": None}
    if api_key_set:
        try:
            from app.core.gemini_client import check_gemini_health
            health = await asyncio.wait_for(check_gemini_health(), timeout=8.0)
            gemini_status = {
                "healthy": health.is_healthy,
                "latency_ms": round(health.latency_ms, 1),
                "error": health.error,
            }
        except Exception as exc:
            gemini_status["error"] = str(exc)[:100]

    agent_ready = False
    brain_ready = False
    try:
        from app.agent.auto_apply_agent import run_auto_apply_agent  # noqa: F401
        from app.agents.intent_agent import IntentAgent  # noqa: F401
        from app.agents.validation_agent import JobValidationAgent  # noqa: F401
        agent_ready = True
    except Exception as exc:
        logger.warning("Agent module not ready: %s", exc)

    try:
        from app.agents.brain_agent import BrainAgent  # noqa: F401
        brain_ready = True
    except Exception as exc:
        logger.warning("Brain agent not ready: %s", exc)

    overall_ready = agent_ready and brain_ready and api_key_set

    return {
        "status": "ready" if overall_ready else "unavailable",
        "agent_ready": agent_ready,
        "brain_ready": brain_ready,
        "model": model_name,
        "api_key_configured": api_key_set,
        "gemini": gemini_status,
        "pipeline_version": "autonomous_v2",
        "architecture": "llm_first",
    }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_profile_summary(profile: dict[str, Any]) -> str:
    name = profile.get("fullName") or profile.get("full_name") or "You"
    college = profile.get("college") or "N/A"
    branch = profile.get("branch") or "N/A"
    cgpa = profile.get("cgpa") or "N/A"
    raw_skills = profile.get("skills") or []
    skills = [
        s if isinstance(s, str) else (s.get("name") or s.get("skill") or "")
        for s in raw_skills
    ]
    skills = [s for s in skills if s][:15]

    lines = [
        f"**{name}**",
        f"College: {college}  |  Branch: {branch}  |  CGPA: {cgpa}",
    ]
    if skills:
        lines.append(f"Skills ({len(skills)}): {', '.join(skills)}")
    else:
        lines.append("Skills: Not available")
    return "\n".join(lines)
