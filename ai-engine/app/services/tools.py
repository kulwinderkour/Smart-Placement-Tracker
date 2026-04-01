import logging

import httpx
from langchain.tools import tool

from app.config import settings

logger = logging.getLogger(__name__)

BACKEND_URL = settings.BACKEND_URL


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
        # Admin jobs are on the Express server (port 8081)
        r = httpx.get("http://localhost:8081/api/admin-jobs/active", timeout=10.0)
        jobs = r.json().get("jobs", [])

        if min_package_lpa > 0:
            jobs = [j for j in jobs if j.get("package_lpa") and float(j["package_lpa"]) >= min_package_lpa]

        if not jobs:
            return f"No admin-posted jobs found with package >= {min_package_lpa} LPA"

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
    except Exception as e:
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
        r = httpx.get(f"http://localhost:8081/api/admin-jobs/active/{job_id}", timeout=10.0)
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
            deadline_date = datetime.strptime(deadline, "%Y-%m-%d").date()
            if deadline_date < datetime.now().date():
                eligible = False
                reasons.append("Application deadline has passed")

        if eligible:
            return f"ELIGIBLE for job {job_id}: {job['title']} at {job['company']}"
        else:
            return f"NOT ELIGIBLE for job {job_id}: {'. '.join(reasons)}"

    except Exception as e:
        return f"Error checking eligibility: {str(e)}"


@tool
def apply_to_job(job_id: str, student_token: str, resume_url: str) -> str:
    """
    Applies to a specific admin-posted job on behalf of the student.
    Only call this after confirming eligibility and student approval.
    Args:
        job_id: Job ID to apply to (UUID string)
        student_token: Student's JWT auth token (to identify the student)
        resume_url: URL of student's uploaded resume from Supabase
    Returns:
        Success or failure message
    """
    try:
        response = httpx.post(
            "http://localhost:8081/api/admin-jobs/apply",
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
        else:
            return f"Failed to apply to job {job_id}: {response.json().get('error', 'Unknown error')}"

    except Exception as e:
        return f"Error applying to job: {str(e)}"
