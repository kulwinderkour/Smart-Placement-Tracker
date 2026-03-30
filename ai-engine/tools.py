import httpx
from langchain.tools import tool

BACKEND_URL = "http://localhost:8000"  # your FastAPI URL

@tool
def get_jobs_above_lpa(lpa_threshold: float) -> str:
    """
    Fetch all jobs from the job board that offer a package
    greater than or equal to the given LPA threshold.
    Use this before applying to know which jobs qualify.
    """
    response = httpx.get(
        f"{BACKEND_URL}/jobs",
        params={"min_lpa": lpa_threshold}
    )
    jobs = response.json()
    if not jobs:
        return f"No jobs found above {lpa_threshold} LPA"
    
    result = f"Found {len(jobs)} jobs above {lpa_threshold} LPA:\n"
    for job in jobs:
        result += f"- {job['company']} | {job['role']} | {job['package_lpa']} LPA | ID: {job['id']}\n"
    return result


@tool
def apply_to_job(job_id: str, user_id: str, resume_path: str = "resume.pdf") -> str:
    """
    Apply to a specific job using the job ID.
    Attaches the user's resume automatically.
    Returns success or failure message.
    """
    response = httpx.post(
        f"{BACKEND_URL}/applications/apply",
        json={
            "job_id": job_id,
            "user_id": user_id,
            "resume_path": resume_path
        }
    )
    if response.status_code == 200:
        return f"Successfully applied to job {job_id}"
    else:
        return f"Failed to apply to job {job_id}: {response.text}"


@tool
def get_application_summary(user_id: str) -> str:
    """
    Returns a summary of all jobs the agent applied to in this session.
    Call this at the end to report back to the user.
    """
    response = httpx.get(f"{BACKEND_URL}/applications/{user_id}/recent")
    apps = response.json()
    if not apps:
        return "No applications found."
    summary = f"Total applications: {len(apps)}\n"
    for app in apps:
        summary += f"✓ {app['company']} — {app['package_lpa']} LPA — Status: {app['status']}\n"
    return summary
