import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.agent_service import run_resume_match_agent

router = APIRouter(prefix="/agent", tags=["agent"])
logger = logging.getLogger(__name__)


class ResumeMatchRequest(BaseModel):
    job_role: str
    required_skills: list[str] = Field(default_factory=list)
    resume_text: str = ""
    resume_path: str = ""


@router.post("/match-resume")
def match_resume(payload: ResumeMatchRequest):
    if not payload.job_role.strip():
        raise HTTPException(status_code=422, detail="job_role is required")

    if not payload.resume_text.strip() and not payload.resume_path.strip():
        raise HTTPException(
            status_code=422,
            detail="Provide either resume_text or resume_path",
        )

    try:
        result = run_resume_match_agent(
            job_role=payload.job_role,
            required_skills=payload.required_skills,
            resume_text=payload.resume_text or None,
            resume_path=payload.resume_path or None,
        )
        return {"success": True, "data": result}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error("Resume match failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
