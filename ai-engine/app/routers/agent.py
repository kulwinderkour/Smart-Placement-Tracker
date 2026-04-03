import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.agent import run_agent

router = APIRouter(prefix="/agent", tags=["agent"])
logger = logging.getLogger(__name__)


class AgentRequest(BaseModel):
    prompt: str
    user_id: str
    resume_path: str = "resume.pdf"
    student_token: str = ""   # JWT token — required for apply_to_job


class AutoApplyRequest(BaseModel):
    student_token: str
    resume_url: str
    min_package_lpa: float
    student_cgpa: float
    student_skills: str
    user_id: str = ""
    additional_filters: str = ""


class AgentResponse(BaseModel):
    result: str


@router.post("/run", response_model=AgentResponse)
def run_placement_agent(payload: AgentRequest):
    """
    Run the AI placement agent with a natural language prompt.
    Example prompt: "Apply to all jobs above 20 LPA with my resume"
    """
    if not payload.prompt.strip():
        raise HTTPException(status_code=422, detail="Prompt must not be empty.")

    logger.info(f"Agent invoked — user={payload.user_id} prompt='{payload.prompt[:80]}'")

    result = run_agent(
        prompt=payload.prompt,
        user_id=payload.user_id,
        resume_path=payload.resume_path,
        student_token=payload.student_token,
    )
    return AgentResponse(result=result)


@router.post("/apply-jobs")
def auto_apply_jobs(request: AutoApplyRequest):
    """
    Trigger the agent to automatically apply to eligible admin-posted jobs.
    """
    try:
        user_message = f"""
Apply to available SmartPlacement jobs for a student with these details:
- Minimum package preference: {request.min_package_lpa} LPA
- Student CGPA: {request.student_cgpa}
- Student skills: {request.student_skills}
- Additional preferences: {request.additional_filters or 'None'}

Steps to follow:
1. Fetch all admin-posted jobs with package >= {request.min_package_lpa} LPA
2. Check eligibility for each job using the student CGPA and skills above
3. Apply to all eligible jobs using apply_to_job — the student_token and resume_url are in the [Context] below
4. Return a clear summary of what was applied and what was skipped with reasons
        """

        result = run_agent(
            prompt=user_message,
            user_id=request.user_id or "auto-agent",
            resume_path=request.resume_url,
            student_token=request.student_token,
        )
        return {"success": True, "summary": result}

    except Exception as e:
        logger.error(f"Auto-apply agent failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
