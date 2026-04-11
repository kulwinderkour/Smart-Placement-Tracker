"""
ai-engine/app/agent/tools.py

Five LangChain @tool definitions for the Smart Placement Agent.

Note on imports:
  - "match_scorer"     maps to app.services.profile_matcher_service (predict())
  - "InsightExtractor" maps to app.services.explanation_service (generate_explanation())
  Both are the existing production services; no separate matcher.py / insight_extractor.py
  files are needed.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any

import requests
from langchain.tools import tool

from app.config import settings

# ── service aliases (as described in the spec) ────────────────────────────────
from app.services import profile_matcher_service as match_scorer          # "match_scorer singleton"
from app.services.explanation_service import generate_explanation as _insight_fallback  # "InsightExtractor"

logger = logging.getLogger(__name__)

# ── runtime config ─────────────────────────────────────────────────────────────
_BACKEND_URL: str = os.environ.get("BACKEND_URL", settings.BACKEND_URL).rstrip("/")
_GEMMA_MODEL: str = os.environ.get("GEMMA_MODEL", "gemma-3-27b-it")
_GOOGLE_API_KEY: str = os.environ.get("GOOGLE_AI_API_KEY", settings.GEMINI_API_KEY)


# ── private helpers ────────────────────────────────────────────────────────────

def _deadline_passed(deadline_str: str | None) -> bool:
    """Return True when the deadline ISO string is in the past."""
    if not deadline_str:
        return False
    try:
        dl = datetime.fromisoformat(deadline_str.replace("Z", "+00:00"))
        if dl.tzinfo is None:
            dl = dl.replace(tzinfo=timezone.utc)
        return dl < datetime.now(tz=timezone.utc)
    except Exception:
        return False


def _normalise_lpa(raw: Any) -> float:
    """Convert raw salary value to LPA float (handles plain rupees > 1000)."""
    try:
        val = float(raw)
        return round(val / 100_000, 2) if val > 1000 else val
    except (TypeError, ValueError):
        return 0.0


# ══════════════════════════════════════════════════════════════════════════════
# Tool 1 — fetch_dashboard_jobs
# ══════════════════════════════════════════════════════════════════════════════

@tool
def fetch_dashboard_jobs() -> str:
    """
    Fetch all active jobs posted by the admin.
    Calls GET /api/admin-jobs/active on the backend.
    Returns a formatted listing: ID, title, company, package, skills, location, deadline.
    Takes no arguments.
    """
    url = f"{_BACKEND_URL}/api/admin-jobs/active"
    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        data = resp.json()
    except requests.ConnectionError:
        return (
            f"ERROR: Could not connect to backend at {url}. "
            "Ensure the backend server is running."
        )
    except requests.Timeout:
        return f"ERROR: Request to {url} timed out after 10 seconds."
    except Exception as exc:
        return f"ERROR: Failed to fetch jobs — {exc}"

    jobs: list[dict] = data if isinstance(data, list) else data.get("jobs", [])

    if not jobs:
        return "No jobs currently posted by admin."

    lines: list[str] = []
    for j in jobs:
        skills_str = ", ".join(j.get("required_skills") or []) or "Not specified"
        deadline = j.get("application_deadline") or j.get("deadline") or "No deadline"
        lines.append(
            f"ID: {j['id']}\n"
            f"  Title    : {j.get('title', 'N/A')}\n"
            f"  Company  : {j.get('company') or j.get('company_name', 'N/A')}\n"
            f"  Package  : {j.get('package_lpa', 'Not specified')} LPA\n"
            f"  Skills   : {skills_str}\n"
            f"  Location : {j.get('location', 'Not specified')}\n"
            f"  Deadline : {deadline}"
        )

    return f"Found {len(lines)} active job(s):\n\n" + "\n\n".join(lines)


# ══════════════════════════════════════════════════════════════════════════════
# Tool 2 — filter_and_score_jobs
# ══════════════════════════════════════════════════════════════════════════════

@tool
def filter_and_score_jobs(student_profile_json: str, intent_json: str) -> str:
    """
    Score every active job against the student's profile using the ML matcher,
    apply intent-based filters (min_lpa, field_keywords), skip expired deadlines
    and sub-35% matches, then return a sorted summary.

    Args:
        student_profile_json: JSON string of the student profile dict.
        intent_json: JSON string produced by parse_instruction().

    Returns:
        Ranked, formatted list of jobs with decision APPLY or SKIP and reason.
    """
    try:
        profile: dict = json.loads(student_profile_json)
    except json.JSONDecodeError as exc:
        return f"ERROR: Invalid student_profile_json — {exc}"
    try:
        intent: dict = json.loads(intent_json)
    except json.JSONDecodeError as exc:
        return f"ERROR: Invalid intent_json — {exc}"

    url = f"{_BACKEND_URL}/api/admin-jobs/active"
    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        return f"ERROR: Could not fetch jobs — {exc}"

    jobs: list[dict] = data if isinstance(data, list) else data.get("jobs", [])
    if not jobs:
        return "No jobs currently posted by admin."

    min_lpa: float | None = intent.get("min_lpa")
    field_keywords: list[str] = intent.get("field_keywords") or []

    student_dict: dict = {
        "name": (
            profile.get("fullName")
            or profile.get("full_name")
            or profile.get("name")
            or "Student"
        ),
        "college": profile.get("college", ""),
        "branch": profile.get("branch", ""),
        "cgpa": float(profile.get("cgpa") or 0),
        "skills": list(profile.get("skills") or []),
        "experience": profile.get("experience", ""),
    }

    results: list[dict] = []

    for job in jobs:
        job_id = job.get("id")
        title = job.get("title", "")
        company = job.get("company") or job.get("company_name", "")
        pkg = _normalise_lpa(job.get("package_lpa") or job.get("salary_min"))
        deadline = job.get("application_deadline") or job.get("deadline")

        # ── Filter: deadline ────────────────────────────────────────────────
        if _deadline_passed(deadline):
            results.append({
                "job_id": job_id, "title": title, "company": company,
                "package_lpa": pkg, "match_score": 0,
                "matched_skills": [], "gap_skills": [],
                "decision": "SKIP", "reason": "Deadline has passed",
            })
            continue

        # ── Filter: minimum LPA ──────────────────────────────────────────────
        if min_lpa is not None and pkg < min_lpa:
            results.append({
                "job_id": job_id, "title": title, "company": company,
                "package_lpa": pkg, "match_score": 0,
                "matched_skills": [], "gap_skills": [],
                "decision": "SKIP",
                "reason": f"Package {pkg} LPA is below minimum {min_lpa} LPA",
            })
            continue

        # ── Filter: field keywords ───────────────────────────────────────────
        if field_keywords:
            haystack = f"{title} {job.get('description', '')}".lower()
            if not any(kw.lower() in haystack for kw in field_keywords):
                results.append({
                    "job_id": job_id, "title": title, "company": company,
                    "package_lpa": pkg, "match_score": 0,
                    "matched_skills": [], "gap_skills": [],
                    "decision": "SKIP", "reason": "Job field does not match intent",
                })
                continue

        # ── ML match scoring ─────────────────────────────────────────────────
        try:
            match_result: dict = match_scorer.predict(
                student_dict,
                {
                    "title": title,
                    "company": company,
                    "required_skills": list(job.get("required_skills") or []),
                    "description": job.get("description", ""),
                },
            )
        except Exception as exc:
            logger.warning("Scorer failed for job %s: %s", job_id, exc)
            match_result = {
                "match_score": 0, "match_label": "Error",
                "matched_skills": [], "gap_skills": [],
            }

        score: float = match_result.get("match_score", 0)

        if score < 35:
            results.append({
                "job_id": job_id, "title": title, "company": company,
                "package_lpa": pkg, "match_score": score,
                "matched_skills": match_result.get("matched_skills", []),
                "gap_skills": match_result.get("gap_skills", []),
                "decision": "SKIP",
                "reason": f"Match score {score}% is below 35% threshold",
            })
            continue

        results.append({
            "job_id": job_id, "title": title, "company": company,
            "package_lpa": pkg, "match_score": score,
            "match_label": match_result.get("match_label", ""),
            "matched_skills": match_result.get("matched_skills", []),
            "gap_skills": match_result.get("gap_skills", []),
            "decision": "APPLY",
            "reason": f"Match score {score}% meets threshold",
        })

    results.sort(key=lambda x: x.get("match_score", 0), reverse=True)

    if not results:
        return "No qualifying jobs found after applying all filters."

    apply_count = sum(1 for r in results if r["decision"] == "APPLY")
    skip_count = len(results) - apply_count
    header = (
        f"Scored {len(results)} job(s) — "
        f"{apply_count} to APPLY, {skip_count} SKIP.\n\n"
    )

    lines: list[str] = []
    for r in results:
        icon = "✅ APPLY" if r["decision"] == "APPLY" else "❌ SKIP"
        lines.append(
            f"{icon} — {r['title']} at {r['company']}\n"
            f"  Job ID        : {r['job_id']}\n"
            f"  Package       : {r.get('package_lpa', 'N/A')} LPA\n"
            f"  Match Score   : {r.get('match_score', 0):.1f}%"
            f"  {r.get('match_label', '')}\n"
            f"  Matched Skills: {', '.join(r.get('matched_skills', [])) or 'None'}\n"
            f"  Gap Skills    : {', '.join(r.get('gap_skills', [])) or 'None'}\n"
            f"  Reason        : {r.get('reason', '')}"
        )

    return header + "\n\n".join(lines)


# ══════════════════════════════════════════════════════════════════════════════
# Tool 3 — generate_application_description
# ══════════════════════════════════════════════════════════════════════════════

@tool
def generate_application_description(
    student_profile_json: str,
    job_json: str,
    match_result_json: str,
) -> str:
    """
    Generate a personalised cover description (130–170 words) for a job application.
    Tries Gemma (ChatGoogleGenerativeAI) first; falls back to template on failure.

    Args:
        student_profile_json: JSON string of the student's profile.
        job_json: JSON string of the job object.
        match_result_json: JSON string of the match result (from filter_and_score_jobs).

    Returns:
        Plain-text cover description with a word-count note appended.
    """
    try:
        profile: dict = json.loads(student_profile_json)
    except json.JSONDecodeError as exc:
        return f"ERROR: Invalid student_profile_json — {exc}"
    try:
        job: dict = json.loads(job_json)
    except json.JSONDecodeError as exc:
        return f"ERROR: Invalid job_json — {exc}"
    try:
        match: dict = json.loads(match_result_json)
    except json.JSONDecodeError as exc:
        return f"ERROR: Invalid match_result_json — {exc}"

    name = (
        profile.get("fullName")
        or profile.get("full_name")
        or profile.get("name")
        or "I"
    )
    college   = profile.get("college", "")
    branch    = profile.get("branch", "")
    cgpa      = profile.get("cgpa", "")
    skills    = ", ".join(profile.get("skills") or [])
    title     = job.get("title", "this role")
    company   = job.get("company") or job.get("company_name", "your company")
    required  = ", ".join(job.get("required_skills") or [])
    matched   = ", ".join(match.get("matched_skills") or [])
    gaps      = ", ".join(match.get("gap_skills") or [])
    score     = match.get("match_score", "N/A")

    # ── Attempt Gemma generation ─────────────────────────────────────────────
    gemma_text: str | None = None
    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        from langchain_core.messages import HumanMessage

        llm = ChatGoogleGenerativeAI(
            model=_GEMMA_MODEL,
            google_api_key=_GOOGLE_API_KEY,
            temperature=0.7,
            max_output_tokens=320,
        )

        prompt = (
            "Write a professional job application cover description in exactly 130–170 words.\n\n"
            f"Student      : {name}\n"
            f"Education    : {branch} from {college}, CGPA {cgpa}\n"
            f"Skills       : {skills}\n\n"
            f"Job          : {title} at {company}\n"
            f"Required     : {required}\n\n"
            f"Match Analysis:\n"
            f"  Score          : {score}%\n"
            f"  Matched Skills : {matched or 'None'}\n"
            f"  Skills to Build: {gaps or 'None'}\n\n"
            "Instructions:\n"
            "- Write in first person as the student\n"
            "- Highlight matched skills and how they apply to the role\n"
            "- Acknowledge skill gaps briefly and express eagerness to grow\n"
            "- End with a confident, professional call to action\n"
            "- Output ONLY the cover description — no title, no heading, no bullet points"
        )

        response = llm.invoke([HumanMessage(content=prompt)])
        text: str = response.content.strip()
        if text and len(text.split()) >= 80:
            gemma_text = text
            logger.info("Gemma generated description (%d words).", len(text.split()))
        else:
            logger.warning("Gemma returned too-short text (%d words) — falling back.", len(text.split()))
    except Exception as exc:
        logger.warning("Gemma call failed — using template fallback: %s", exc)

    if gemma_text:
        word_count = len(gemma_text.split())
        return f"{gemma_text}\n\n[Word count: {word_count}]"

    # ── Template fallback (InsightExtractor) ─────────────────────────────────
    fallback_payload: dict = {
        "job_role": title,
        "match": float(match.get("match_score") or 0) >= 50,
        "profile_match_pct": score,
        "role_match": bool(matched),
        "matched_skills": match.get("matched_skills") or [],
        "missing_skills": match.get("gap_skills") or [],
    }
    fallback_text = _insight_fallback(fallback_payload)
    word_count = len(fallback_text.split())
    return f"{fallback_text}\n\n[Word count: {word_count}] [Source: template fallback]"


# ══════════════════════════════════════════════════════════════════════════════
# Tool 4 — submit_application
# ══════════════════════════════════════════════════════════════════════════════

@tool
def submit_application(
    job_id: str,
    student_token: str,
    resume_url: str,
    description: str,
) -> str:
    """
    Submit a job application on behalf of the student via the backend API.

    Args:
        job_id: Job ID (integer or UUID) to apply to.
        student_token: Student's JWT auth token for the Authorization header.
        resume_url: URL of the student's uploaded resume.
        description: Cover description from generate_application_description.

    Returns:
        Success message with job title, or a clear skip/error message.
    """
    url = f"{_BACKEND_URL}/api/admin-jobs/apply"
    payload: dict[str, Any] = {
        "jobId": job_id,
        "resumeUrl": resume_url,
        "coverLetter": description,
        "agentApplied": True,
    }
    headers: dict[str, str] = {"Authorization": f"Bearer {student_token}"}

    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=10)
    except requests.ConnectionError:
        return f"ERROR: Could not connect to backend at {url}."
    except requests.Timeout:
        return f"ERROR: Application request timed out for job {job_id}."
    except Exception as exc:
        return f"ERROR: Unexpected error submitting application — {exc}"

    if resp.status_code == 200:
        data = resp.json()
        job_title = (
            data.get("application", {}).get("job_title")
            or data.get("job", {}).get("title")
            or job_id
        )
        app_id = data.get("application", {}).get("id", "N/A")
        return (
            f"✅ Successfully applied to '{job_title}' (Job ID: {job_id}).\n"
            f"Application ID: {app_id}"
        )
    elif resp.status_code == 409:
        return f"Already applied to this job — skipping (Job ID: {job_id})."
    elif resp.status_code == 410:
        return f"Deadline has passed — skipping (Job ID: {job_id})."
    elif resp.status_code == 401:
        return f"ERROR: Authentication failed — check student_token for job {job_id}."
    else:
        try:
            err_msg = resp.json().get("error") or resp.json().get("detail") or resp.text
        except Exception:
            err_msg = resp.text
        return (
            f"ERROR: Application failed for job {job_id} — "
            f"HTTP {resp.status_code}: {err_msg}"
        )


# ══════════════════════════════════════════════════════════════════════════════
# Tool 5 — generate_final_summary
# ══════════════════════════════════════════════════════════════════════════════

@tool
def generate_final_summary(results_json: str) -> str:
    """
    Build a human-readable summary of the agent's auto-apply run.

    Args:
        results_json: JSON array of result dicts, each with keys:
                      job_id, title, company, match_score, decision,
                      reason (optional), application_id (optional).

    Returns:
        Formatted summary with applied / skipped sections and total counts.
    """
    try:
        results: list[dict] = json.loads(results_json)
    except json.JSONDecodeError as exc:
        return f"ERROR: Invalid results_json — {exc}"

    if not results:
        return "No results to summarise — the agent did not process any jobs."

    applied = [r for r in results if str(r.get("decision", "")).upper() == "APPLY"]
    skipped = [r for r in results if str(r.get("decision", "")).upper() != "APPLY"]

    lines: list[str] = [
        "═══════════════════════════════════════════",
        "    SMART PLACEMENT AGENT — RUN SUMMARY    ",
        "═══════════════════════════════════════════",
        f"  Total Processed : {len(results)}",
        f"  Applied          : {len(applied)}",
        f"  Skipped          : {len(skipped)}",
        "───────────────────────────────────────────",
    ]

    if applied:
        lines.append("\n✅  APPLIED JOBS")
        lines.append("─────────────────")
        for r in applied:
            score_str = (
                f"{r['match_score']:.1f}%"
                if r.get("match_score") is not None
                else "N/A"
            )
            app_id = r.get("application_id") or r.get("app_id") or "N/A"
            lines.append(
                f"  ✓  {r.get('title', 'Unknown')} at {r.get('company', 'Unknown')}\n"
                f"     Job ID      : {r.get('job_id', 'N/A')}\n"
                f"     Match Score : {score_str}\n"
                f"     App ID      : {app_id}"
            )

    if skipped:
        lines.append("\n❌  SKIPPED JOBS")
        lines.append("──────────────────")
        for r in skipped:
            reason = r.get("reason") or "Not specified"
            lines.append(
                f"  ✗  {r.get('title', 'Unknown')} at {r.get('company', 'Unknown')}\n"
                f"     Job ID : {r.get('job_id', 'N/A')}\n"
                f"     Reason : {reason}"
            )

    lines.append("\n═══════════════════════════════════════════")
    return "\n".join(lines)
