import logging

import httpx
from langchain.tools import tool

from app.config import settings

logger = logging.getLogger(__name__)

BACKEND_URL = "http://localhost:8000/api/v1"


@tool
def get_jobs_above_lpa(lpa_threshold: float) -> str:
    """
    Fetch all jobs from the job board that offer a package
    greater than or equal to the given LPA threshold.
    Use this before applying to know which jobs qualify.
    """
    try:
        response = httpx.get(
            f"{BACKEND_URL}/jobs",
            params={"min_lpa": lpa_threshold},
            timeout=15.0,
        )
        response.raise_for_status()
        jobs = response.json()
        if not jobs:
            return f"No jobs found above {lpa_threshold} LPA."

        result = f"Found {len(jobs)} jobs above {lpa_threshold} LPA:\n"
        for job in jobs:
            result += (
                f"- {job.get('company', 'Unknown')} | "
                f"{job.get('role', job.get('title', 'Role N/A'))} | "
                f"{job.get('package_lpa', 'N/A')} LPA | "
                f"ID: {job.get('id', 'N/A')}\n"
            )
        return result
    except Exception as e:
        logger.error(f"get_jobs_above_lpa failed: {e}")
        return f"Error fetching jobs: {str(e)}"


@tool
def apply_to_job(job_id: str, user_id: str, resume_path: str = "resume.pdf") -> str:
    """
    Apply to a specific job using the job ID.
    Attaches the user's resume automatically.
    Returns a success or failure message.
    """
    try:
        response = httpx.post(
            f"{BACKEND_URL}/applications/apply",
            json={
                "job_id": job_id,
                "user_id": user_id,
                "resume_path": resume_path,
            },
            timeout=15.0,
        )
        if response.status_code == 200:
            return f"Successfully applied to job {job_id}."
        return f"Failed to apply to job {job_id}: {response.text}"
    except Exception as e:
        logger.error(f"apply_to_job failed: {e}")
        return f"Error applying to job {job_id}: {str(e)}"


@tool
def get_application_summary(user_id: str) -> str:
    """
    Returns a summary of all jobs the agent applied to in this session.
    Call this at the end to report back to the user.
    """
    try:
        response = httpx.get(
            f"{BACKEND_URL}/applications/{user_id}/recent",
            timeout=15.0,
        )
        response.raise_for_status()
        apps = response.json()
        if not apps:
            return "No applications found."

        summary = f"Total applications: {len(apps)}\n"
        for app in apps:
            summary += (
                f"✓ {app.get('company', 'Unknown')} — "
                f"{app.get('package_lpa', 'N/A')} LPA — "
                f"Status: {app.get('status', 'Submitted')}\n"
            )
        return summary
    except Exception as e:
        logger.error(f"get_application_summary failed: {e}")
        return f"Error fetching application summary: {str(e)}"
