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
    )
    return AgentResponse(result=result)
