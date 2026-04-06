import json
import logging
import os

import httpx
from langchain.tools import tool

from app.config import settings
from app.services import profile_matcher_service

logger = logging.getLogger(__name__)

# Use BACKEND_URL from config (works in Docker: http://backend-api:8000/...)
# But admin-jobs lives on the Express server (port 8081 / service name "backend-api" in docker-compose)
# We build a separate base URL for the Express backend.
_EXPRESS_BASE = os.environ.get(
    "EXPRESS_BACKEND_URL",
    "http://localhost:8081"   # default for local dev outside Docker
)


AGENT_SYSTEM_PROMPT = """
You are a Smart Placement Agent that helps students find and apply to suitable jobs.

You have access to the following tools:
- fetch_admin_jobs: Get all active jobs posted by the admin.
- score_student_job_match: Score how well a student's profile matches a specific job using a
  trained machine learning model (GradientBoostingRegressor with semantic similarity features).
  This is NOT rule-based — it uses a model trained on skill overlap, role alignment, and
  semantic similarity via sentence-transformers. Always use this before applying.
- generate_and_apply: Score the student against a job and automatically apply if the ML model
  score is >= 50 and the student's CGPA meets the minimum requirement. Never apply without scoring.
- apply_to_job: Apply to a job using the student's token. Only call after scoring.

Important rules:
1. Always call score_student_job_match or generate_and_apply before applying to any job.
2. Never apply to a job with a SKIP recommendation.
3. Use only jobs from fetch_admin_jobs — never suggest external jobs.
4. Be transparent about match scores and missing skills.
"""


@tool
def fetch_admin_jobs(min_package_lpa: float = 0) -> str:
    """
    Fetches all active jobs posted by SmartPlacement admin.
    Only use this tool to get jobs — do NOT use any external job source.
    Args:
        min_package_lpa: Minimum package in LPA to filter by (default 0 = all jobs)
    Returns:
        JSON string summary of available jobs
    """
    try:
        url = f"{_EXPRESS_BASE}/api/admin-jobs/active"
        r = httpx.get(url, timeout=10.0)
        r.raise_for_status()
        data = r.json()
        jobs = data.get("jobs", [])

        if min_package_lpa > 0:
            jobs = [j for j in jobs if j.get("package_lpa") and float(j["package_lpa"]) >= min_package_lpa]

        if not jobs:
            return (
                f"No admin-posted jobs found with package >= {min_package_lpa} LPA. "
                "The admin may not have posted any jobs yet, or all deadlines have passed."
            )

        summary = []
        for j in jobs:
            summary.append(
                f"ID:{j['id']} | {j['title']} at {j['company']} | "
                f"Package: {j.get('package_lpa', 'Not specified')} LPA | "
                f"Location: {j.get('location', 'Not specified')} | "
                f"Required Skills: {', '.join(j.get('required_skills') or [])} | "
                f"Min CGPA: {j.get('min_cgpa', 0)}"
            )
        return "\n".join(summary)
    except httpx.ConnectError:
        return (
            f"Cannot connect to backend at {_EXPRESS_BASE}. "
            "Make sure the Express server is running. "
            "Set EXPRESS_BACKEND_URL env var if running in Docker."
        )
    except Exception as e:
        logger.error(f"fetch_admin_jobs error: {e}", exc_info=True)
        return f"Error fetching jobs: {str(e)}"


@tool
def score_student_job_match(student_profile_json: str, job_id: str) -> str:
    """
    Scores how well a student's profile matches a specific job using the trained ML model.
    Always call this before deciding to apply. Never skip this step.

    Uses a GradientBoostingRegressor trained on skill overlap, role alignment, and
    semantic similarity — NOT hardcoded keyword matching.

    Args:
        student_profile_json: JSON string with student fields:
            name/fullName, college, branch, cgpa (float), skills (list of strings),
            experience (optional string)
        job_id: Job ID string from fetch_admin_jobs

    Returns:
        Match score (0-100), label, matched/gap skills, and APPLY or SKIP recommendation
    """
    try:
        try:
            profile = json.loads(student_profile_json)
        except json.JSONDecodeError as e:
            return f"Invalid student_profile_json — could not parse JSON: {e}"

        url = f"{_EXPRESS_BASE}/api/admin-jobs/active/{job_id}"
        r = httpx.get(url, timeout=10.0)
        if r.status_code == 404:
            return f"Job {job_id} not found."
        r.raise_for_status()
        job = r.json()

        student_dict = {
            "name": profile.get("fullName") or profile.get("name") or "Unknown",
            "college": profile.get("college", ""),
            "branch": profile.get("branch", ""),
            "skills": list(profile.get("skills") or []),
            "experience": profile.get("experience", ""),
        }
        job_dict = {
            "title": job.get("title", ""),
            "company": job.get("company", ""),
            "required_skills": list(job.get("required_skills") or []),
        }

        result = profile_matcher_service.predict(student_dict, job_dict)

        student_cgpa = float(profile.get("cgpa") or 0)
        min_cgpa = float(job.get("min_cgpa") or 0)
        cgpa_ok = (min_cgpa == 0) or (student_cgpa >= min_cgpa)
        recommendation = "APPLY" if (result["match_score"] >= 50 and cgpa_ok) else "SKIP"

        skip_reasons = []
        if result["match_score"] < 50:
            skip_reasons.append(f"match score {result['match_score']}% is below 50%")
        if not cgpa_ok:
            skip_reasons.append(f"CGPA {student_cgpa} is below required {min_cgpa}")

        lines = [
            f"Job: {job.get('title')} at {job.get('company')}",
            f"Match Score : {result['match_score']}% — {result['match_label']}",
            f"Matched Skills : {', '.join(result['matched_skills']) or 'None'}",
            f"Gap Skills     : {', '.join(result['gap_skills']) or 'None'}",
            f"CGPA Check     : {'PASS' if cgpa_ok else f'FAIL (need {min_cgpa}, have {student_cgpa})'}",
            f"Recommendation : {recommendation}",
        ]
        if skip_reasons:
            lines.append(f"Reason for SKIP: {'; '.join(skip_reasons)}")

        return "\n".join(lines)

    except httpx.ConnectError:
        return (
            f"Cannot connect to backend at {_EXPRESS_BASE}. "
            "Make sure the Express server is running."
        )
    except Exception as e:
        logger.error(f"score_student_job_match error: {e}", exc_info=True)
        return f"Error scoring match: {str(e)}"


@tool
def generate_and_apply(
    student_profile_json: str,
    job_id: str,
    student_token: str,
    resume_url: str,
) -> str:
    """
    Scores the student against the job using the trained ML model, then applies
    automatically if the recommendation is APPLY (score >= 50 and CGPA met).
    Never applies without scoring first.

    Args:
        student_profile_json: JSON string with student profile fields
            (name/fullName, college, branch, cgpa, skills, experience)
        job_id: Job ID from fetch_admin_jobs
        student_token: Student's JWT auth token from [Context]
        resume_url: URL of student's uploaded resume

    Returns:
        Score result and outcome of application attempt, or reason for skipping
    """
    try:
        try:
            profile = json.loads(student_profile_json)
        except json.JSONDecodeError as e:
            return f"Invalid student_profile_json — could not parse JSON: {e}"

        url = f"{_EXPRESS_BASE}/api/admin-jobs/active/{job_id}"
        r = httpx.get(url, timeout=10.0)
        if r.status_code == 404:
            return f"Job {job_id} not found."
        r.raise_for_status()
        job = r.json()

        student_dict = {
            "name": profile.get("fullName") or profile.get("name") or "Unknown",
            "college": profile.get("college", ""),
            "branch": profile.get("branch", ""),
            "skills": list(profile.get("skills") or []),
            "experience": profile.get("experience", ""),
        }
        job_dict = {
            "title": job.get("title", ""),
            "company": job.get("company", ""),
            "required_skills": list(job.get("required_skills") or []),
        }

        result = profile_matcher_service.predict(student_dict, job_dict)

        student_cgpa = float(profile.get("cgpa") or 0)
        min_cgpa = float(job.get("min_cgpa") or 0)
        cgpa_ok = (min_cgpa == 0) or (student_cgpa >= min_cgpa)
        should_apply = result["match_score"] >= 50 and cgpa_ok

        score_summary = (
            f"ML Score: {result['match_score']}% ({result['match_label']}) | "
            f"Matched: {', '.join(result['matched_skills']) or 'None'} | "
            f"Gaps: {', '.join(result['gap_skills']) or 'None'}"
        )

        if not should_apply:
            reasons = []
            if result["match_score"] < 50:
                reasons.append(f"score {result['match_score']}% < 50%")
            if not cgpa_ok:
                reasons.append(f"CGPA {student_cgpa} < required {min_cgpa}")
            return (
                f"SKIPPED application to job {job_id}.\n"
                f"{score_summary}\n"
                f"Reason: {'; '.join(reasons)}"
            )

        apply_url = f"{_EXPRESS_BASE}/api/admin-jobs/apply"
        response = httpx.post(
            apply_url,
            json={"jobId": job_id, "resumeUrl": resume_url, "agentApplied": True},
            headers={"Authorization": f"Bearer {student_token}"},
            timeout=10.0,
        )

        if response.status_code == 200:
            data = response.json()
            return (
                f"APPLIED to job {job_id} ({job.get('title')} at {job.get('company')}).\n"
                f"{score_summary}\n"
                f"Application ID: {data['application']['id']}"
            )
        elif response.status_code == 409:
            return f"Already applied to job {job_id} previously.\n{score_summary}"
        elif response.status_code == 401:
            return f"Authentication failed for job {job_id}. Check student_token."
        else:
            err = response.json().get("error", "Unknown error")
            return f"Failed to apply to job {job_id}: {err}\n{score_summary}"

    except httpx.ConnectError:
        return f"Cannot connect to backend at {_EXPRESS_BASE}."
    except Exception as e:
        logger.error(f"generate_and_apply error: {e}", exc_info=True)
        return f"Error in generate_and_apply: {str(e)}"


@tool
def apply_to_job(job_id: str, student_token: str, resume_url: str) -> str:
    """
    Applies to a specific admin-posted job on behalf of the student.
    Only call this after confirming eligibility.
    IMPORTANT: Use the student_token value exactly as provided in the [Context] section of the prompt.
    Args:
        job_id: Job ID to apply to (UUID string)
        student_token: Student's JWT auth token — use the value from [Context] student_token
        resume_url: URL of student's uploaded resume
    Returns:
        Success or failure message
    """
    try:
        url = f"{_EXPRESS_BASE}/api/admin-jobs/apply"
        response = httpx.post(
            url,
            json={
                "jobId": job_id,
                "resumeUrl": resume_url,
                "agentApplied": True
            },
            headers={"Authorization": f"Bearer {student_token}"},
            timeout=10.0
        )

        if response.status_code == 200:
            data = response.json()
            return f"Successfully applied to job {job_id}. Application ID: {data['application']['id']}"
        elif response.status_code == 409:
            return f"Already applied to job {job_id} previously"
        elif response.status_code == 401:
            return f"Authentication failed for job {job_id}. Student token is invalid or missing."
        else:
            err = response.json().get("error", "Unknown error")
            return f"Failed to apply to job {job_id}: {err}"

    except httpx.ConnectError:
        return f"Cannot connect to backend at {_EXPRESS_BASE} to apply."
    except Exception as e:
        logger.error(f"apply_to_job error: {e}", exc_info=True)
        return f"Error applying to job: {str(e)}"
