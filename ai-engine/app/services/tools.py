import logging

import httpx
from langchain.tools import tool

from app.config import settings

logger = logging.getLogger(__name__)

BACKEND_URL = settings.BACKEND_URL


@tool
def get_jobs_above_lpa(lpa_threshold: float) -> str:
    """
    Fetch available remote job listings from the job board.
    Returns jobs with their IDs, titles, companies, and salary info.
    Note: jobs are sourced from Remotive (remote/international jobs, salary in USD)
    and the local database. Apply to jobs by their ID.
    """
    collected: list[dict] = []

    # 1. Local DB jobs (scraped/manually added)
    try:
        r = httpx.get(f"{BACKEND_URL}/jobs", params={"limit": 100}, timeout=15.0)
        if r.status_code == 200:
            payload = r.json()
            for j in (payload.get("data", []) if isinstance(payload, dict) else []):
                collected.append({
                    "id": str(j.get("id", "")),
                    "company_name": j.get("company_name", "Unknown"),
                    "role_title": j.get("role_title", "Unknown"),
                    "salary": f"{j.get('salary_min', '')} - {j.get('salary_max', '')} LPA".strip(" -") or "Not listed",
                    "source_url": j.get("source_url", ""),
                })
    except Exception as e:
        logger.warning(f"Local DB jobs fetch failed: {e}")

    # 2. Remotive (free public API — same source used by the job board)
    try:
        r = httpx.get(
            "https://remotive.com/api/remote-jobs",
            params={"limit": 20},
            timeout=20.0,
        )
        if r.status_code == 200:
            for job in r.json().get("jobs", []):
                source_url = job.get("url", "")
                if not source_url:
                    continue
                desc = job.get("description", "") or ""
                desc_plain = desc[:300] if len(desc) <= 300 else desc[:300] + "..."
                upsert = httpx.post(
                    f"{BACKEND_URL}/internal/agent/upsert-job",
                    json={
                        "source_url": source_url,
                        "company_name": job.get("company_name", "Unknown"),
                        "role_title": job.get("title", "Unknown"),
                        "description": desc_plain,
                    },
                    timeout=10.0,
                )
                if upsert.status_code in (200, 201):
                    local_id = upsert.json().get("id", "")
                    collected.append({
                        "id": local_id,
                        "company_name": job.get("company_name", "Unknown"),
                        "role_title": job.get("title", "Unknown"),
                        "salary": job.get("salary") or "Not listed",
                        "source_url": source_url,
                    })
    except Exception as e:
        logger.warning(f"Remotive fetch failed: {e}")

    if not collected:
        return "No jobs available right now. The job sources may be temporarily unavailable."

    result = f"Found {len(collected)} available jobs (Remotive salaries are in USD):\n"
    for job in collected[:30]:
        result += (
            f"- {job['company_name']} | {job['role_title']} | "
            f"Salary: {job['salary']} | ID: {job['id']}\n"
        )
    return result


@tool
def apply_to_job(job_id: str, user_id: str, resume_path: str = "resume.pdf") -> str:
    """
    Apply to a specific job using the job ID.
    Attaches the user's resume automatically.
    Returns a success or failure message.
    """
    try:
        response = httpx.post(
            f"{BACKEND_URL}/internal/agent/apply",
            json={
                "job_id": job_id,
                "user_id": user_id,
                "resume_path": resume_path,
            },
            timeout=15.0,
        )
        if response.status_code in (200, 201):
            data = response.json()
            if data.get("status") == "already_applied":
                return f"Already applied to job {job_id}."
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
            f"{BACKEND_URL}/internal/agent/applications/{user_id}",
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
