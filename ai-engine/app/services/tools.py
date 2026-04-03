import logging
import os

import httpx
from langchain.tools import tool

from app.config import settings

logger = logging.getLogger(__name__)

# Use BACKEND_URL from config (works in Docker: http://backend-api:8000/...)
# But admin-jobs lives on the Express server (port 8081 / service name "backend-api" in docker-compose)
# We build a separate base URL for the Express backend.
_EXPRESS_BASE = os.environ.get(
    "EXPRESS_BACKEND_URL",
    "http://localhost:8081"   # default for local dev outside Docker
)


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
def check_eligibility(job_id: str, student_cgpa: float, student_skills: str) -> str:
    """
    Checks if a student is eligible for a specific admin-posted job.
    Args:
        job_id: The job ID from fetch_admin_jobs (UUID string)
        student_cgpa: Student's CGPA
        student_skills: Comma-separated list of student skills
    Returns:
        Eligibility result with reason
    """
    try:
        url = f"{_EXPRESS_BASE}/api/admin-jobs/active/{job_id}"
        r = httpx.get(url, timeout=10.0)
        if r.status_code == 404:
            return f"Job {job_id} not found"

        job = r.json()
        reasons = []
        eligible = True

        # CGPA check
        min_cgpa = float(job.get("min_cgpa") or 0)
        if min_cgpa > 0 and student_cgpa < min_cgpa:
            eligible = False
            reasons.append(f"CGPA {student_cgpa} is below required {min_cgpa}")

        # Skills check
        required = [s.lower() for s in (job.get("required_skills") or [])]
        student = [s.strip().lower() for s in student_skills.split(",")]
        missing = [r for r in required if not any(r in s or s in r for s in student)]
        if missing:
            reasons.append(f"Missing skills: {', '.join(missing)}")

        # Deadline check
        deadline = job.get("application_deadline")
        if deadline:
            from datetime import datetime
            try:
                deadline_date = datetime.strptime(deadline[:10], "%Y-%m-%d").date()
                if deadline_date < datetime.now().date():
                    eligible = False
                    reasons.append("Application deadline has passed")
            except ValueError:
                pass  # ignore malformed date

        if eligible:
            return f"ELIGIBLE for job {job_id}: {job['title']} at {job['company']}"
        else:
            return f"NOT ELIGIBLE for job {job_id}: {'. '.join(reasons)}"

    except Exception as e:
        logger.error(f"check_eligibility error: {e}", exc_info=True)
        return f"Error checking eligibility: {str(e)}"


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
