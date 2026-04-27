"""
Auto Apply Pipeline - Autonomous Agent System

Understand → Plan → Validate → Execute → Log → Recover

This pipeline:
1. Uses Intent Agent to understand user request
2. Uses Resume Agent to extract/profile student
3. Fetches jobs and validates them
4. Calls the SACRED prediction model (profile_matcher_service.predict)
5. Generates cover letters via Gemini
6. Applies to jobs
7. Logs everything
8. Handles failures with recovery

CRITICAL: The prediction model at profile_matcher_service.predict() is NEVER modified.
It is only called as a black box with student_profile and job dict.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

import re

import httpx

from app.config import settings
from app.core.agent_logger import AgentLogger, AgentStatus, AgentType, create_session_id
from app.core.gemini_client import check_gemini_health
from app.agents.intent_agent import IntentAgent, ParsedIntent, get_intent_agent
from app.agents.resume_agent import ResumeAgent, ResumeExtraction, get_resume_agent
from app.agents.validation_agent import JobValidationAgent, ValidationResult, get_validation_agent
from app.services import profile_matcher_service as match_scorer

logger = logging.getLogger(__name__)


def _to_lpa(raw) -> float:
    """Convert a raw salary DB value to LPA float.

    Handles:
      - int/float in rupees  (> 1 000)  → divide by 100 000
      - int/float already in LPA (≤ 100) → use as-is
      - string like "₹8 - 12 LPA"        → extract highest numeric token
      - None / empty                      → 0.0
    """
    if raw is None:
        return 0.0
    if isinstance(raw, (int, float)):
        val = float(raw)
        return round(val / 100_000, 2) if val > 1_000 else val
    if isinstance(raw, str):
        nums = re.findall(r"\d+(?:\.\d+)?", raw.replace(",", ""))
        if nums:
            return float(max(nums, key=float))
    return 0.0


class PipelineStep(str, Enum):
    """Pipeline step identifiers."""
    INIT = "init"
    HEALTH_CHECK = "health_check"
    INTENT_PARSE = "intent_parse"
    RESUME_EXTRACT = "resume_extract"
    RESUME_SYNC = "resume_sync"
    FETCH_JOBS = "fetch_jobs"
    VALIDATE_JOBS = "validate_jobs"
    RUN_PREDICTION = "run_prediction"  # 🔒 Sacred step
    FILTER_BY_INTENT = "filter_by_intent"
    GENERATE_COVER = "generate_cover"
    APPLY = "apply"
    LOG_RESULTS = "log_results"
    COMPLETE = "complete"


@dataclass
class JobApplication:
    """Single job application result."""
    job_id: str
    job_title: str
    company: str
    match_score: float
    prediction_result: dict  # Raw output from sacred model
    cover_letter: str
    application_id: str | None = None
    status: str = "pending"  # pending | applied | failed | skipped
    reason: str | None = None  # If skipped/failed
    filter_reason: str | None = None  # Why filtered out


@dataclass
class PipelineResult:
    """Complete pipeline execution result."""
    success: bool
    session_id: str
    summary: str
    
    # Intent understanding
    parsed_intent: ParsedIntent | None = None
    
    # Resume extraction
    resume_extraction: ResumeExtraction | None = None
    
    # Jobs processed
    jobs_total: int = 0
    jobs_validated: int = 0
    jobs_scored: int = 0
    jobs_filtered: int = 0
    
    # Applications
    applications: list[JobApplication] = field(default_factory=list)
    total_applied: int = 0
    total_failed: int = 0
    total_skipped: int = 0
    
    # Performance
    duration_ms: int = 0
    
    # Debug
    steps_completed: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


class AutoApplyPipeline:
    """
    Autonomous AI Agent Pipeline for job applications.
    
    Understand → Plan → Validate → Execute → Log → Recover
    """
    
    def __init__(
        self,
        student_token: str,
        student_profile: dict[str, Any],
        resume_url: str,
        api_base: str | None = None
    ):
        self.student_token = student_token
        self.student_profile = student_profile
        self.resume_url = resume_url
        self.api_base = api_base or self._get_api_base()
        
        # Session tracking
        self.session_id = create_session_id()
        
        # Agent logger
        student_id = student_profile.get("id") or student_profile.get("user_id")
        self.logger = AgentLogger(
            session_id=self.session_id,
            student_id=uuid.UUID(student_id) if student_id else None,
            api_token=student_token
        )
        
        # Agents
        self.intent_agent = get_intent_agent()
        self.resume_agent = get_resume_agent()
        self.validation_agent = get_validation_agent()
        
        # State
        self._jobs: list[dict] = []
        self._parsed_intent: ParsedIntent | None = None
        self._resume_data: ResumeExtraction | None = None
        self._applications: list[JobApplication] = []
        
        logger.info(f"[Pipeline:{self.session_id}] Initialized for student")
    
    def _get_api_base(self) -> str:
        """Get backend API base URL."""
        import os
        raw = (os.getenv("BACKEND_URL") or settings.BACKEND_URL or "http://localhost:8000").rstrip("/")
        if raw.endswith("/api/v1"):
            return raw
        return f"{raw}/api/v1"
    
    async def execute(
        self,
        instruction: str,
        prefetched_jobs: list | None = None,
        skip_salary_filter: bool = False,
    ) -> PipelineResult:
        """
        Execute the full pipeline.
        
        Args:
            instruction: Natural language user instruction
            prefetched_jobs: Optional pre-filtered job list from session cache.
                             When provided the FETCH_JOBS network call is skipped.
            
        Returns:
            PipelineResult with all applications and logs
        """
        import time
        start_time = time.time()
        
        steps_completed = []
        errors = []
        
        try:
            # ─────────────────────────────────────────────────────────────────
            # STEP 1: Health Check
            # ─────────────────────────────────────────────────────────────────
            self.logger.log_started(
                AgentType.AUTO_APPLY,
                PipelineStep.HEALTH_CHECK,
                {"instruction": instruction[:100]}
            )
            
            health = await check_gemini_health()
            if not health.is_healthy:
                logger.warning(f"[Pipeline:{self.session_id}] Gemini unhealthy: {health.error}")
                # Continue anyway - will use fallbacks
            
            self.logger.log_success(
                AgentType.AUTO_APPLY,
                PipelineStep.HEALTH_CHECK,
                {"gemini_healthy": health.is_healthy}
            )
            steps_completed.append(PipelineStep.HEALTH_CHECK)
            
            # ─────────────────────────────────────────────────────────────────
            # STEP 2: Understand Intent (Gemini Intent Agent)
            # ─────────────────────────────────────────────────────────────────
            async with self.logger.step(PipelineStep.INTENT_PARSE, AgentType.INTENT) as step:
                step.set_input({"instruction": instruction})
                
                self._parsed_intent = await self.intent_agent.parse(instruction, self.logger)
                
                step.set_output({"intent": self._parsed_intent.__dict__})
                step.set_metadata({
                    "confidence": self._parsed_intent.confidence,
                    "parser": self._parsed_intent.parsed_by
                })
            
            steps_completed.append(PipelineStep.INTENT_PARSE)
            
            # ─────────────────────────────────────────────────────────────────
            # STEP 3: Extract Resume (if resume URL provided)
            # ─────────────────────────────────────────────────────────────────
            if self.resume_url:
                async with self.logger.step(PipelineStep.RESUME_EXTRACT, AgentType.RESUME) as step:
                    step.set_input({"resume_url": self.resume_url})
                    
                    # Fetch and parse resume
                    resume_text, self._resume_bytes = await self._fetch_resume_text(self.resume_url)
                    
                    if resume_text:
                        self._resume_data = await self.resume_agent.extract(resume_text, self.logger)

                        step.set_output({
                            "skills_found": len(self._resume_data.skills),
                            "education_entries": len(self._resume_data.education),
                        })
                    else:
                        step.set_output({"error": "Could not fetch resume"})

            # ─────────────────────────────────────────────────────────────────
            # STEP 3b: Sync extracted profile to backend DB
            # ─────────────────────────────────────────────────────────────────
            if self.resume_url:
                steps_completed.append(PipelineStep.RESUME_EXTRACT)

            if self._resume_data is not None:
                async with self.logger.step(PipelineStep.RESUME_SYNC, AgentType.RESUME) as sync_step:
                    synced = await self._sync_profile_to_backend(
                        self._resume_data,
                        file_bytes=getattr(self, "_resume_bytes", None),
                    )
                    sync_step.set_output({"synced": synced})
                steps_completed.append(PipelineStep.RESUME_SYNC)
            
            # ─────────────────────────────────────────────────────────────────
            # STEP 4: Fetch Jobs (skip if cached jobs were passed in)
            # ─────────────────────────────────────────────────────────────────
            async with self.logger.step(PipelineStep.FETCH_JOBS, AgentType.AUTO_APPLY) as step:
                if prefetched_jobs is not None:
                    self._jobs = prefetched_jobs
                    step.set_output({"jobs_fetched": len(self._jobs), "source": "session_cache"})
                    logger.info("[Pipeline:%s] Using %d cached jobs from session (salary filter will be skipped)", self.session_id, len(self._jobs))
                else:
                    self._jobs = await self._fetch_jobs()
                    step.set_output({"jobs_fetched": len(self._jobs), "source": "fetch"})
            
            steps_completed.append(PipelineStep.FETCH_JOBS)
            
            if not self._jobs:
                duration = int((time.time() - start_time) * 1000)
                await self.logger.flush()
                
                return PipelineResult(
                    success=True,
                    session_id=str(self.session_id),
                    summary="No active jobs currently available.",
                    parsed_intent=self._parsed_intent,
                    resume_extraction=self._resume_data,
                    jobs_total=0,
                    total_applied=0,
                    duration_ms=duration,
                    steps_completed=steps_completed
                )
            
            # ─────────────────────────────────────────────────────────────────
            # STEP 5: Validate Jobs
            # ─────────────────────────────────────────────────────────────────
            validated_jobs = []
            
            async with self.logger.step(PipelineStep.VALIDATE_JOBS, AgentType.VALIDATION) as step:
                source_blocked = 0
                for job in self._jobs:
                    # ── Hard source guard ─────────────────────────────────────
                    # Only SmartPlacement verified jobs (company_profile_id IS NOT
                    # NULL and is_active=True) may be auto-applied to.
                    # Scraped / external / Job-Board jobs are blocked here, even
                    # if they arrived via the Redis search cache.
                    company_profile_id = job.get("company_profile_id")
                    is_active = job.get("is_active")
                    if not company_profile_id or is_active is False:
                        job_id = job.get("id", "unknown")
                        job_title = job.get("role_title") or job.get("title", "unknown")
                        logger.warning(
                            "[Pipeline:%s] BLOCKED job_id=%s title=%r "
                            "reason=external_job_not_allowed "
                            "company_profile_id=%s is_active=%s",
                            self.session_id, job_id, job_title,
                            company_profile_id, is_active,
                        )
                        self._applications.append(JobApplication(
                            job_id=str(job_id),
                            job_title=job_title,
                            company=job.get("company_name") or job.get("company", ""),
                            status="skipped",
                            filter_reason="external_job_not_allowed",
                        ))
                        source_blocked += 1
                        continue
                    # ── Quick validation (no Gemini overhead) ─────────────────
                    is_valid, errors = self.validation_agent.quick_validate(job)
                    
                    if is_valid:
                        validated_jobs.append(job)
                
                step.set_output({
                    "jobs_validated": len(validated_jobs),
                    "jobs_rejected": len(self._jobs) - len(validated_jobs) - source_blocked,
                    "source_blocked": source_blocked,
                })
            
            self._jobs = validated_jobs
            steps_completed.append(PipelineStep.VALIDATE_JOBS)
            
            # ─────────────────────────────────────────────────────────────────
            # STEP 6: Score with Prediction Model (🔒 SACRED - DO NOT MODIFY)
            # ─────────────────────────────────────────────────────────────────
            # This is the ONLY place where the prediction model is called.
            # We only change how we CALL it, never what's INSIDE it.
            # ─────────────────────────────────────────────────────────────────
            
            async with self.logger.step(PipelineStep.RUN_PREDICTION, AgentType.AUTO_APPLY) as step:
                scored_jobs = []
                
                
                # Normalize student profile
                raw_skills = self.student_profile.get("skills") or []
                normalized_skills = [
                    s if isinstance(s, str) else (s.get("name") or s.get("skill") or "")
                    for s in raw_skills
                ]
                normalized_skills = [s.strip() for s in normalized_skills if s and s.strip()]
                
                student_dict = {
                    "name": self.student_profile.get("fullName") or self.student_profile.get("full_name", "Student"),
                    "college": self.student_profile.get("college", ""),
                    "branch": self.student_profile.get("branch", ""),
                    "cgpa": float(self.student_profile.get("cgpa") or 0),
                    "skills": normalized_skills,
                    "experience": self.student_profile.get("experience", ""),
                }
                
                step.set_input({
                    "student_skills_count": len(normalized_skills),
                    "jobs_to_score": len(self._jobs)
                })
                
                for job in self._jobs:
                    job_id = job.get("id")
                    job_dict = {
                        "title": job.get("role_title") or job.get("title", ""),
                        "company": job.get("company_name") or job.get("company", ""),
                        "required_skills": self._normalize_skills(job.get("required_skills", [])),
                        "description": job.get("description", ""),
                        "job_type": job.get("job_type", ""),
                        "company_type": job.get("company_type", ""),
                    }
                    
                    try:
                        # 🔒 SACRED CALL - profile_matcher_service.predict()
                        # This is the ONLY call to the prediction model.
                        # DO NOT modify match_scorer or its predict method.
                        prediction = match_scorer.predict(student_dict, job_dict)
                        
                        scored_jobs.append({
                            "job": job,
                            "prediction": prediction,
                            "match_score": prediction.get("match_score", 0)
                        })
                        
                    except Exception as e:
                        logger.error(f"[Pipeline:{self.session_id}] Prediction failed for job {job_id}: {e}")
                        # Fallback to CGPA-based score
                        cgpa = student_dict.get("cgpa", 0)
                        fallback_score = max(0.0, (cgpa - 7.0) / 3.0 * 25.0) if cgpa >= 7.0 else 0.0
                        
                        scored_jobs.append({
                            "job": job,
                            "prediction": {
                                "match_score": round(fallback_score, 1),
                                "match_label": "Poor Match",
                                "matched_skills": [],
                                "gap_skills": [],
                                "model_used": False,
                                "error": str(e)
                            },
                            "match_score": fallback_score,
                            "fallback": True
                        })
                
                self._jobs = scored_jobs
                step.set_output({
                    "jobs_scored": len(scored_jobs),
                    "model_failures": sum(1 for j in scored_jobs if j.get("fallback"))
                })
            
            steps_completed.append(PipelineStep.RUN_PREDICTION)
            
            # ─────────────────────────────────────────────────────────────────
            # STEP 7: Filter by Intent + Score Threshold
            # ─────────────────────────────────────────────────────────────────
            async with self.logger.step(PipelineStep.FILTER_BY_INTENT, AgentType.AUTO_APPLY) as step:
                qualifying = []
                filtered_count = 0
                filter_log_entries = []  # Detailed per-job audit trail

                intent = self._parsed_intent
                min_lpa = float(intent.salary_min_lpa or 0) if intent else 0.0
                max_lpa = float(intent.salary_max_lpa) if (intent and intent.salary_max_lpa) else float("inf")
                field_keywords = intent.field_keywords if intent else []

                for item in self._jobs:
                    job = item["job"]
                    prediction = item["prediction"]
                    match_score = item["match_score"]
                    job_id = job.get("id", "unknown")

                    filter_reason = None

                    # ── Package parsing ────────────────────────────────────────
                    # BUG FIX: Use salary_max to check "job pays at least X LPA".
                    # A job with salary_max=1200000 and salary_min=800000 should
                    # pass a "above 5 LPA" filter.  Using salary_min caused valid
                    # high-paying jobs (whose floor was unset / 0) to be rejected.
                    #
                    # Strategy:
                    #   job_lpa_max  = salary_max converted to LPA  (primary gate)
                    #   job_lpa_min  = salary_min converted to LPA  (for logging only)
                    # If salary_max is missing but salary_min is set, fall back to min.
                    # If both are 0/None the package is "unknown" — we let it pass
                    # the salary gate (don't reject on missing data).
                    # _to_lpa() is defined at module level.
                    job_lpa_max = _to_lpa(job.get("salary_max") or job.get("package_max"))
                    job_lpa_min = _to_lpa(job.get("salary_min") or job.get("package_min"))

                    # If salary_max missing but min exists, use min as the only known bound
                    if job_lpa_max == 0.0 and job_lpa_min > 0.0:
                        job_lpa_max = job_lpa_min

                    # ── Salary gate ───────────────────────────────────────────
                    # CORRECT LOGIC: job qualifies when its max offer >= user's minimum
                    # Unknown salary (both 0) → do NOT reject; let prediction score decide
                    # When jobs came from session cache they were already salary-filtered
                    # by _handle_job_search — skip the gate to avoid double-filtering.
                    salary_pass = True
                    salary_detail = f"job_max={job_lpa_max}LPA job_min={job_lpa_min}LPA user_min={min_lpa}LPA user_max={'∞' if max_lpa == float('inf') else max_lpa}LPA"

                    if not skip_salary_filter:
                        if min_lpa > 0 and job_lpa_max > 0 and job_lpa_max < min_lpa:
                            salary_pass = False
                            filter_reason = f"salary: job max {job_lpa_max}LPA < required {min_lpa}LPA"
                        elif max_lpa < float("inf") and job_lpa_min > max_lpa:
                            salary_pass = False
                            filter_reason = f"salary: job min {job_lpa_min}LPA > user max {max_lpa}LPA"

                    # ── Field keywords gate ───────────────────────────────────
                    if salary_pass and field_keywords:
                        job_text = f"{job.get('role_title', '')} {job.get('description', '')}".lower()
                        if not any(kw.lower() in job_text for kw in field_keywords):
                            filter_reason = f"field: none of {field_keywords} found in role/description"

                    # ── Prediction score gate ─────────────────────────────────
                    dynamic_threshold = 35
                    if field_keywords and any(kw.lower() in job.get("role_title", "").lower() for kw in field_keywords):
                        dynamic_threshold = 25

                    if not filter_reason and match_score < dynamic_threshold:
                        filter_reason = f"score: {match_score:.1f}% < threshold {dynamic_threshold}%"

                    # ── Per-job audit log ─────────────────────────────────────
                    filter_log_entries.append({
                        "job_id": job_id,
                        "job_title": job.get("role_title", "?"),
                        "parsed_package": {"min_lpa": job_lpa_min, "max_lpa": job_lpa_max},
                        "salary_filter_result": "pass" if salary_pass else "fail",
                        "prediction_score": round(match_score, 2),
                        "score_threshold": dynamic_threshold,
                        "rejection_reason": filter_reason,
                        "outcome": "filtered" if filter_reason else "qualifying",
                        "salary_detail": salary_detail,
                    })
                    logger.info(
                        f"[Pipeline:{self.session_id}] JOB {job_id} | "
                        f"{salary_detail} | score={match_score:.1f}% | "
                        f"{'FILTERED: ' + filter_reason if filter_reason else 'QUALIFYING'}"
                    )

                    if filter_reason:
                        filtered_count += 1
                        self._applications.append(JobApplication(
                            job_id=job_id,
                            job_title=job.get("role_title", "Unknown"),
                            company=job.get("company_name", "Unknown"),
                            match_score=match_score,
                            prediction_result=prediction,
                            cover_letter="",
                            status="skipped",
                            filter_reason=filter_reason
                        ))
                    else:
                        qualifying.append(item)

                self._jobs = qualifying
                step.set_output({
                    "qualifying_jobs": len(qualifying),
                    "filtered_jobs": filtered_count,
                    "user_min_lpa": min_lpa,
                    "user_max_lpa": max_lpa if max_lpa != float("inf") else None,
                })
                step.set_metadata({
                    "filter_audit": filter_log_entries,
                    "intent_salary_min": min_lpa,
                    "intent_salary_max": max_lpa if max_lpa != float("inf") else None,
                    "field_keywords": field_keywords,
                })
            
            steps_completed.append(PipelineStep.FILTER_BY_INTENT)
            
            # ─────────────────────────────────────────────────────────────────
            # STEP 8: Generate Cover Letters
            # ─────────────────────────────────────────────────────────────────
            async with self.logger.step(PipelineStep.GENERATE_COVER, AgentType.COVER_LETTER) as step:
                for item in self._jobs:
                    job = item["job"]
                    prediction = item["prediction"]
                    
                    cover_letter = await self._generate_cover_letter(
                        self.student_profile,
                        job,
                        prediction
                    )
                    
                    self._applications.append(JobApplication(
                        job_id=job.get("id"),
                        job_title=job.get("role_title", "Unknown"),
                        company=job.get("company_name", "Unknown"),
                        match_score=item["match_score"],
                        prediction_result=prediction,
                        cover_letter=cover_letter,
                        status="pending"
                    ))
                
                step.set_output({"covers_generated": len(self._jobs)})
            
            steps_completed.append(PipelineStep.GENERATE_COVER)
            
            # ─────────────────────────────────────────────────────────────────
            # STEP 9: Apply to Jobs
            # ─────────────────────────────────────────────────────────────────
            async with self.logger.step(PipelineStep.APPLY, AgentType.AUTO_APPLY) as step:
                applied_count = 0
                failed_count = 0
                
                for app in self._applications:
                    if app.status != "pending":
                        continue
                    
                    try:
                        result = await self._apply_to_job(
                            app.job_id,
                            app.cover_letter
                        )
                        
                        if result.get("success"):
                            app.status = "applied"
                            app.application_id = result.get("application_id")
                            applied_count += 1
                        else:
                            app.status = "failed"
                            app.reason = result.get("error", "Unknown error")
                            failed_count += 1
                            
                    except Exception as e:
                        app.status = "failed"
                        app.reason = str(e)
                        failed_count += 1
                
                step.set_output({
                    "applied": applied_count,
                    "failed": failed_count
                })
            
            steps_completed.append(PipelineStep.APPLY)
            
            # ─────────────────────────────────────────────────────────────────
            # STEP 10: Build Summary
            # ─────────────────────────────────────────────────────────────────
            duration = int((time.time() - start_time) * 1000)
            
            summary = self._build_summary()
            
            # Flush logs
            await self.logger.flush()
            
            steps_completed.append(PipelineStep.COMPLETE)
            
            return PipelineResult(
                success=True,
                session_id=str(self.session_id),
                summary=summary,
                parsed_intent=self._parsed_intent,
                resume_extraction=self._resume_data,
                jobs_total=len(self._jobs) + sum(1 for a in self._applications if a.filter_reason),
                jobs_validated=len(validated_jobs),
                jobs_scored=len(scored_jobs) if "scored_jobs" in dir() else 0,
                jobs_filtered=filtered_count,
                applications=self._applications,
                total_applied=applied_count,
                total_failed=failed_count,
                total_skipped=filtered_count,
                duration_ms=duration,
                steps_completed=steps_completed,
                errors=errors
            )
            
        except Exception as e:
            logger.exception(f"[Pipeline:{self.session_id}] Pipeline failed: {e}")
            
            self.logger.log_failed(
                AgentType.AUTO_APPLY,
                "pipeline",
                e
            )
            await self.logger.flush()
            
            duration = int((time.time() - start_time) * 1000)
            
            return PipelineResult(
                success=False,
                session_id=str(self.session_id),
                summary=f"Pipeline failed: {str(e)}",
                parsed_intent=self._parsed_intent,
                errors=[str(e)],
                duration_ms=duration,
                steps_completed=steps_completed
            )
    
    async def _fetch_resume_text(self, resume_url: str) -> tuple[str | None, bytes | None]:
        """Fetch resume from backend signed URL and extract text.

        Flow:
          1. GET /student/resume (student JWT) -> signed_url + file_name
          2. Download PDF bytes via signed_url
          3. parse_resume(bytes, filename) -> text
        Falls back to (None, None) on any error; pipeline continues without resume data.
        Returns: (extracted_text, raw_file_bytes)
        """
        from app.services.resume_parser import parse_resume as _parse

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                meta_resp = await client.get(
                    f"{self.api_base}/student/resume",
                    headers={"Authorization": f"Bearer {self.student_token}"},
                )
                if meta_resp.status_code != 200:
                    logger.warning(
                        "[Pipeline:%s] Resume metadata fetch failed: HTTP %s",
                        self.session_id, meta_resp.status_code,
                    )
                    return None, None

                meta = meta_resp.json()
                signed_url: str = meta.get("signed_url") or ""
                file_name: str = meta.get("file_name") or "resume.pdf"
                if not signed_url:
                    logger.warning("[Pipeline:%s] No signed_url in resume response", self.session_id)
                    return None, None

                pdf_resp = await client.get(signed_url, timeout=30.0)
                if pdf_resp.status_code != 200:
                    logger.warning(
                        "[Pipeline:%s] Resume download failed: HTTP %s",
                        self.session_id, pdf_resp.status_code,
                    )
                    return None, None

                file_bytes = pdf_resp.content
                if not file_bytes:
                    return None, None

        except Exception as exc:
            logger.warning("[Pipeline:%s] Resume fetch error: %s", self.session_id, exc)
            return None, None

        try:
            loop = asyncio.get_event_loop()
            from concurrent.futures import ThreadPoolExecutor
            with ThreadPoolExecutor(max_workers=1) as pool:
                text = await loop.run_in_executor(pool, lambda: _parse(file_bytes, file_name))
            if text:
                logger.info(
                    "[Pipeline:%s] Resume extracted: %d chars from '%s'",
                    self.session_id, len(text), file_name,
                )
            return (text or None), file_bytes
        except Exception as exc:
            logger.warning("[Pipeline:%s] Resume extraction error: %s", self.session_id, exc)
            return None, None

    async def _sync_profile_to_backend(
        self,
        extraction: "ResumeExtraction",
        file_bytes: bytes | None = None,
    ) -> bool:
        """Hardened resume profile sync.

        Dual-hash dedup:
          file_hash    = sha256(file_bytes)   — changes when binary differs
          content_hash = sha256(extracted_text stripped) — same text = same hash
          Skip matrix:
            file_hash same                  → skip everything (0 Gemini, 0 PATCH)
            file_hash changed, content same → skip PATCH, reuse confirmed_skills
            content changed                 → full normalize → merge → PATCH → verify

        Normalization:
          Extracted skills are normalized + deduped via _normalize_skills()
          before being merged into confirmed_skills.

        Failure tracking:
          Every hard failure records an entry in the version history via
          append_resume_failure() so the audit trail captures both successes and errors.
        """
        import hashlib as _hashlib
        from app.core.session_store import (
            load_resume_meta,
            append_resume_version,
            append_resume_failure,
        )

        extracted_skills: list[str] = extraction.normalized_skills or extraction.skills or []
        confidence: float = extraction.extraction_confidence or 0.0

        # ── 1. Compute dual hash ──────────────────────────────────────────────
        if file_bytes:
            file_hash = _hashlib.sha256(file_bytes).hexdigest()
        else:
            file_hash = ""

        # Content hash: sha256 of semantically-normalised text so that
        # whitespace/formatting changes in a new PDF export do NOT alter the hash.
        # Normalisation steps: unicode NFKC → lowercase → collapse all whitespace.
        import unicodedata as _ud, re as _re
        raw_text: str = getattr(extraction, "raw_text", "") or ""
        if not raw_text and extracted_skills:
            raw_text = " ".join(sorted(s.lower() for s in extracted_skills))
        if raw_text:
            _norm = _ud.normalize("NFKC", raw_text)
            _norm = _norm.lower()
            _norm = _re.sub(r"\s+", " ", _norm).strip()
            content_hash = _hashlib.sha256(_norm.encode("utf-8")).hexdigest()
        else:
            content_hash = ""

        try:
            # ── 2. Dual-hash dedup check ──────────────────────────────────────
            stored_meta = await load_resume_meta(self.student_token, self.student_profile)
            stored_file_hash = stored_meta.get("resume_hash") or ""
            stored_content_hash = stored_meta.get("content_hash") or ""

            if file_hash and file_hash == stored_file_hash:
                confirmed = stored_meta.get("confirmed_skills") or []
                logger.info(
                    "[Pipeline:%s] file_hash unchanged — skipping all, reusing %d confirmed skills",
                    self.session_id, len(confirmed),
                )
                if confirmed:
                    self.student_profile["skills"] = confirmed
                return True

            if content_hash and content_hash == stored_content_hash:
                confirmed = stored_meta.get("confirmed_skills") or []
                logger.info(
                    "[Pipeline:%s] content_hash unchanged (new PDF export, same text) — skipping PATCH, reusing %d confirmed skills",
                    self.session_id, len(confirmed),
                )
                if confirmed:
                    self.student_profile["skills"] = confirmed
                return True

            if not extracted_skills:
                logger.info("[Pipeline:%s] No skills extracted — skipping profile sync", self.session_id)
                await append_resume_failure(
                    self.student_token, "no_skills",
                    resume_hash=file_hash, content_hash=content_hash,
                    student_profile=self.student_profile,
                )
                return False

            logger.info(
                "[Pipeline:%s] resume_sync_started: extracted=%d confidence=%.2f",
                self.session_id, len(extracted_skills), confidence,
            )

            # ── 3. Normalize + confidence gate + merge via session_store ──────
            updated_meta = await append_resume_version(
                student_token=self.student_token,
                resume_hash=file_hash,
                skills_snapshot=extracted_skills,
                confidence=confidence,
                content_hash=content_hash,
                student_profile=self.student_profile,
            )
            confirmed_skills: list[str] = updated_meta.get("confirmed_skills") or extracted_skills

            # ── 4. PATCH /student/profile with confirmed_skills ───────────────
            async with httpx.AsyncClient(timeout=15.0) as client:
                patch_resp = await client.patch(
                    f"{self.api_base}/student/profile",
                    json={"skills": confirmed_skills},
                    headers={"Authorization": f"Bearer {self.student_token}"},
                )

            if patch_resp.status_code not in (200, 201):
                logger.error(
                    "[Pipeline:%s] profile_update failed: HTTP %s — %s",
                    self.session_id, patch_resp.status_code, patch_resp.text[:200],
                )
                await append_resume_failure(
                    self.student_token,
                    f"sync_failed:http_{patch_resp.status_code}",
                    resume_hash=file_hash, content_hash=content_hash,
                    student_profile=self.student_profile,
                )
                return False

            logger.info(
                "[Pipeline:%s] profile_updated: %d confirmed skills saved to DB",
                self.session_id, len(confirmed_skills),
            )

            # ── 5. Verify: re-fetch and check all confirmed skills persisted ──
            async with httpx.AsyncClient(timeout=10.0) as client:
                get_resp = await client.get(
                    f"{self.api_base}/student/profile",
                    headers={"Authorization": f"Bearer {self.student_token}"},
                )

            if get_resp.status_code != 200:
                logger.warning(
                    "[Pipeline:%s] sync_verify: could not re-fetch profile (HTTP %s)",
                    self.session_id, get_resp.status_code,
                )
                self.student_profile["skills"] = confirmed_skills
                return True

            refreshed = get_resp.json()
            saved_skills: list[str] = refreshed.get("skills") or []
            expected_set = {s.lower() for s in confirmed_skills}
            saved_set = {s.lower() for s in saved_skills}

            if expected_set <= saved_set:
                logger.info(
                    "[Pipeline:%s] sync_verified: %d confirmed skills all present in DB",
                    self.session_id, len(confirmed_skills),
                )
            else:
                missing = expected_set - saved_set
                logger.warning(
                    "[Pipeline:%s] sync_mismatch: %d confirmed skills missing from DB: %s",
                    self.session_id, len(missing), sorted(missing)[:10],
                )

            # ── 6. Update in-memory profile from verified DB state ────────────
            self.student_profile.update({k: v for k, v in refreshed.items() if v is not None})
            return True

        except Exception as exc:
            logger.error("[Pipeline:%s] _sync_profile_to_backend error: %s", self.session_id, exc)
            await append_resume_failure(
                self.student_token,
                f"exception:{type(exc).__name__}:{str(exc)[:80]}",
                resume_hash=file_hash, content_hash=content_hash,
                student_profile=self.student_profile,
            )
            return False

    async def _fetch_jobs(self) -> list[dict]:
        """Fetch active jobs from backend."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_base}/student/jobs",
                    params={"limit": 100, "is_active": "true"},
                    timeout=15.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    jobs = data.get("data", []) if isinstance(data, dict) else data
                    return jobs or []
                else:
                    logger.error(f"Failed to fetch jobs: {response.status_code}")
                    return []
                    
        except Exception as e:
            logger.error(f"Error fetching jobs: {e}")
            return []
    
    def _normalize_skills(self, raw_skills: list) -> list[str]:
        """Normalize skills from various formats."""
        normalized = []
        for s in raw_skills:
            if isinstance(s, str) and s.strip():
                normalized.append(s.strip())
            elif isinstance(s, dict):
                name = s.get("name") or s.get("skill")
                if name:
                    normalized.append(name.strip())
        return normalized
    
    async def _generate_cover_letter(
        self,
        student: dict,
        job: dict,
        prediction: dict
    ) -> str:
        """Generate cover letter using existing cover letter generator (sync, runs inline)."""
        from app.agent.auto_apply_agent import generate_description_with_gemma
        
        loop = asyncio.get_event_loop()
        from concurrent.futures import ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=1) as pool:
            return await loop.run_in_executor(
                pool,
                lambda: generate_description_with_gemma(student, job, prediction)
            )
    
    async def _apply_to_job(self, job_id: str, cover_letter: str) -> dict:
        """Apply to a single job via backend API."""
        try:
            async with httpx.AsyncClient() as client:
                payload: dict = {
                    "job_id": job_id,
                    "resume_url": self.resume_url or self.student_profile.get("resume_url") or self.student_profile.get("resumeUrl") or "",
                    "cover_letter": cover_letter,
                    "agent_applied": True,
                    "full_name": self.student_profile.get("fullName") or self.student_profile.get("full_name"),
                    "phone": self.student_profile.get("phone"),
                    "college": self.student_profile.get("college"),
                    "branch": self.student_profile.get("branch"),
                    "cgpa": float(self.student_profile.get("cgpa") or 0) or None,
                    "dob": self.student_profile.get("dob"),
                    "gender": self.student_profile.get("gender"),
                }
                response = await client.post(
                    f"{self.api_base}/applications",
                    json={k: v for k, v in payload.items() if v is not None},
                    headers={"Authorization": f"Bearer {self.student_token}"},
                    timeout=10.0
                )
                
                if response.status_code in (200, 201):
                    data = response.json()
                    return {
                        "success": True,
                        "application_id": data.get("id")
                    }
                elif response.status_code == 409:
                    return {
                        "success": False,
                        "error": "Already applied to this job"
                    }
                else:
                    return {
                        "success": False,
                        "error": f"HTTP {response.status_code}: {response.text[:200]}"
                    }
                    
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def _build_summary(self) -> str:
        """Build human-readable summary."""
        applied = [a for a in self._applications if a.status == "applied"]
        skipped = [a for a in self._applications if a.status == "skipped"]
        failed = [a for a in self._applications if a.status == "failed"]
        
        lines = []
        
        if applied:
            lines.append(f"Applied to {len(applied)} job(s):")
            for a in applied:
                lines.append(f"  ✓ {a.job_title} at {a.company} — {a.match_score:.1f}% match")
        
        if failed:
            lines.append(f"\nFailed: {len(failed)} job(s)")
        
        if skipped:
            lines.append(f"\nFiltered out: {len(skipped)} job(s) did not meet criteria")
        
        if not applied and not failed:
            lines.append("No applications submitted. No qualifying jobs found.")
        
        return "\n".join(lines)


# Convenience function
async def run_pipeline(
    instruction: str,
    student_token: str,
    student_profile: dict[str, Any],
    resume_url: str,
    prefetched_jobs: list | None = None,
    skip_salary_filter: bool = False,
) -> PipelineResult:
    """Run the auto-apply pipeline."""
    pipeline = AutoApplyPipeline(student_token, student_profile, resume_url)
    return await pipeline.execute(instruction, prefetched_jobs=prefetched_jobs,
                                  skip_salary_filter=skip_salary_filter)
