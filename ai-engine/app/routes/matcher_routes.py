"""
matcher_routes.py
-----------------
FastAPI router exposing the trained profile-job ML matcher as an API.

Endpoints:
  POST /score       — score a single student against a job
  POST /bulk-score  — score multiple students against one job, sorted by match_score
  GET  /health      — verify ML model is loaded, return version
"""
from __future__ import annotations

import asyncio
import logging
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.config import settings
from app.services.profile_matcher_service import get_model_version, predict, reload_model

# Path to the training script (one level above the app package)
_TRAIN_SCRIPT = Path(__file__).resolve().parents[2] / "train_profile_matcher.py"

_retrain_logger = logging.getLogger("matcher.retrain")

router = APIRouter()
logger = logging.getLogger(__name__)


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class StudentProfile(BaseModel):
    """Structured student profile passed to the matcher."""

    student_id: str = ""
    fullName: str = ""
    college: str = ""
    branch: str = ""
    cgpa: float = 0.0
    graduationYear: int = 0
    skills: list[str] = Field(default_factory=list)
    mockInterviewScore: float = 0.0
    aptitudeStreak: int = 0
    previousCompanies: list[dict[str, Any]] = Field(default_factory=list)


class JobPosting(BaseModel):
    """Structured job posting passed to the matcher."""

    id: str = ""
    title: str = ""
    company: str = ""
    location: str = ""
    package_lpa: float = 0.0
    required_skills: list[str] = Field(default_factory=list)
    min_cgpa: float = 0.0
    job_type: str = ""
    company_type: str = ""


class ScoreRequest(BaseModel):
    student: StudentProfile
    job: JobPosting


class BulkScoreRequest(BaseModel):
    students: list[StudentProfile]
    job: JobPosting


# ── helpers ───────────────────────────────────────────────────────────────────

def _student_to_service_dict(student: StudentProfile) -> dict[str, Any]:
    """Map StudentProfile fields to the dict shape expected by predict()."""
    return {
        "name": student.fullName or "Unknown",
        "college": student.college,
        "branch": student.branch,
        "skills": list(student.skills),
        "experience": (
            ", ".join(c.get("company", "") for c in student.previousCompanies if c.get("company"))
            if student.previousCompanies
            else ""
        ),
    }


def _job_to_service_dict(job: JobPosting) -> dict[str, Any]:
    """Map JobPosting fields to the dict shape expected by predict()."""
    return {
        "title": job.title,
        "company": job.company,
        "required_skills": list(job.required_skills),
        "job_type": job.job_type,
        "company_type": job.company_type,
    }


# ── endpoints ─────────────────────────────────────────────────────────────────

@router.post("/score")
def score(payload: ScoreRequest) -> dict[str, Any]:
    """
    Score a single student profile against a job posting.

    Returns match_score (0–100), match_label, matched_skills,
    gap_skills, and feature_values used by the model.
    """
    try:
        student_dict = _student_to_service_dict(payload.student)
        job_dict = _job_to_service_dict(payload.job)
        result = predict(student_dict, job_dict)
        return result
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        logger.error("Prediction failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(exc)}")


@router.post("/bulk-score")
def bulk_score(payload: BulkScoreRequest) -> dict[str, Any]:
    """
    Score multiple students against a single job posting.

    Returns a list of results sorted by match_score descending.
    Each result includes student_identifier (fullName) alongside
    the standard predict() output.
    """
    job_dict = _job_to_service_dict(payload.job)
    results: list[dict[str, Any]] = []

    for student in payload.students:
        student_dict = _student_to_service_dict(student)
        try:
            outcome = predict(student_dict, job_dict)
        except Exception as exc:
            logger.warning(
                "Prediction skipped for student '%s': %s", student.fullName, exc
            )
            outcome = {
                "match_score": 0.0,
                "match_label": "Error",
                "matched_skills": [],
                "gap_skills": list(payload.job.required_skills),
                "feature_values": {},
            }

        results.append({
            "student_id": student.student_id,
            "student_identifier": student.fullName or "Unknown",
            "match_score": outcome["match_score"],
            "match_label": outcome["match_label"],
            "matched_skills": outcome["matched_skills"],
            "gap_skills": outcome["gap_skills"],
            "feature_values": outcome["feature_values"],
        })

    results.sort(key=lambda r: r["match_score"], reverse=True)
    return {"results": results}


# ── retrain helpers ───────────────────────────────────────────────────────────

def _parse_training_output(output: str) -> dict[str, Any]:
    """Extract metrics from the training script's log lines."""
    r2: float | None = None
    mae: float | None = None
    train_samples: int | None = None
    cv_r2: float | None = None
    within_10: float | None = None

    for line in output.splitlines():
        m = re.search(r"Test\s+R[²2]\s*:\s*([\d.]+)", line)
        if m:
            r2 = float(m.group(1))
        m = re.search(r"Test\s+MAE\s*:\s*([\d.]+)", line)
        if m:
            mae = float(m.group(1))
        m = re.search(r"Training samples\s*:\s*(\d+)", line)
        if m:
            train_samples = int(m.group(1))
        m = re.search(r"CV R[²2].*:\s*([\d.]+)\s*[±±]", line)
        if m:
            cv_r2 = float(m.group(1))
        m = re.search(r"Within\s*[±±]10.*:\s*([\d.]+)", line)
        if m:
            within_10 = float(m.group(1))

    return {
        "r2_score": r2,
        "mae": mae,
        "training_samples": train_samples,
        "cv_r2": cv_r2,
        "within_10_pct": within_10,
    }


@router.post("/retrain")
async def retrain(request: Request) -> dict[str, Any]:
    """
    Retrain the profile-job matcher model without restarting the server.

    Protected by ``X-Admin-Api-Key`` header.  On success the in-memory model
    singleton is replaced with the freshly-trained artifact so all subsequent
    scoring calls use the new weights immediately.

    Returns R², MAE, training sample count, CV R², within-10% accuracy,
    new model version, and the UTC timestamp of the retraining run.
    """
    api_key = request.headers.get("X-Admin-Api-Key", "")
    if not api_key or api_key != settings.MATCHER_ADMIN_API_KEY:
        _retrain_logger.warning(
            "[%s] Retrain attempt with invalid API key from %s",
            datetime.now(timezone.utc).isoformat(),
            request.client.host if request.client else "unknown",
        )
        raise HTTPException(status_code=401, detail="Invalid or missing X-Admin-Api-Key header")

    if not _TRAIN_SCRIPT.exists():
        raise HTTPException(
            status_code=500,
            detail=f"Training script not found at {_TRAIN_SCRIPT}",
        )

    started_at = datetime.now(timezone.utc)
    _retrain_logger.info(
        "[%s] Retraining started by admin", started_at.isoformat()
    )

    try:
        proc = await asyncio.create_subprocess_exec(
            sys.executable,
            str(_TRAIN_SCRIPT),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            cwd=str(_TRAIN_SCRIPT.parent),
        )
        try:
            stdout_bytes, _ = await asyncio.wait_for(
                proc.communicate(), timeout=600.0
            )
        except asyncio.TimeoutError:
            proc.kill()
            _retrain_logger.error(
                "[%s] Retraining timed out after 600 s",
                datetime.now(timezone.utc).isoformat(),
            )
            raise HTTPException(status_code=504, detail="Training timed out after 600 s")
    except HTTPException:
        raise
    except Exception as exc:
        _retrain_logger.error(
            "[%s] Failed to launch training subprocess: %s",
            datetime.now(timezone.utc).isoformat(),
            exc,
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail=f"Failed to launch training: {exc}")

    stdout_text = stdout_bytes.decode(errors="replace")

    if proc.returncode != 0:
        tail = stdout_text[-1000:] if len(stdout_text) > 1000 else stdout_text
        _retrain_logger.error(
            "[%s] Training subprocess exited with code %d.\n%s",
            datetime.now(timezone.utc).isoformat(),
            proc.returncode,
            tail,
        )
        raise HTTPException(
            status_code=500,
            detail=f"Training script exited with code {proc.returncode}: {tail}",
        )

    # Hot-reload the model singleton
    try:
        new_version = reload_model()
    except Exception as exc:
        _retrain_logger.error(
            "[%s] Model reload failed after training: %s",
            datetime.now(timezone.utc).isoformat(),
            exc,
            exc_info=True,
        )
        raise HTTPException(
            status_code=500,
            detail=f"Training succeeded but model reload failed: {exc}",
        )

    metrics = _parse_training_output(stdout_text)
    finished_at = datetime.now(timezone.utc)
    elapsed_s = round((finished_at - started_at).total_seconds(), 1)

    _retrain_logger.info(
        "[%s] Retraining complete — R²=%.4f  MAE=%.2f  samples=%s  version=%s  elapsed=%ss",
        finished_at.isoformat(),
        metrics["r2_score"] or 0,
        metrics["mae"] or 0,
        metrics["training_samples"],
        new_version,
        elapsed_s,
    )

    return {
        "status": "ok",
        "model_version": new_version,
        "r2_score": metrics["r2_score"],
        "mae": metrics["mae"],
        "training_samples": metrics["training_samples"],
        "cv_r2": metrics["cv_r2"],
        "within_10_pct": metrics["within_10_pct"],
        "elapsed_seconds": elapsed_s,
        "retrained_at": finished_at.isoformat(),
    }


@router.get("/health")
def health() -> dict[str, str]:
    """
    Verify the ML model is loaded and return its version.

    Returns {"status": "ok", "model_version": "<version>"} on success,
    or raises 503 if the model file is missing.
    """
    try:
        version = get_model_version()
        return {"status": "ok", "model_version": version}
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        logger.error("Model health check failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Model health check failed: {str(exc)}")
