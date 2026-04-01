import logging

from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import settings
from app.services.tools import fetch_admin_jobs, check_eligibility, apply_to_job

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are a job application agent for SmartPlacement.\n\n"
    "Your ONLY job source is admin-posted jobs fetched via fetch_admin_jobs tool.\n"
    "DO NOT reference external job boards, LinkedIn, Naukri, or any other source.\n"
    "Only work with jobs available in the SmartPlacement admin database.\n\n"
    "Your workflow:\n"
    "1. Fetch admin-posted jobs using fetch_admin_jobs with the student's minimum package\n"
    "2. For each job, check eligibility using check_eligibility\n"
    "3. Apply only to jobs where student is ELIGIBLE\n"
    "4. Give a clear summary at the end: applied to X jobs, skipped Y jobs with reasons\n\n"
    "Always be transparent about why you skipped any job. "
    "Never apply to a job the student is not eligible for."
)


def _build_agent_executor(user_id: str, resume_path: str) -> AgentExecutor:
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not set in the environment.")

    llm = ChatGoogleGenerativeAI(
        model=settings.GEMINI_MODEL or "gemini-2.5-flash-preview-04-17",
        google_api_key=settings.GEMINI_API_KEY,
        temperature=1,  # gemini-2.5-flash requires temperature=1 for thinking mode
    )

    tools = [fetch_admin_jobs, check_eligibility, apply_to_job]

    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", SYSTEM_PROMPT),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ]
    )

    agent = create_tool_calling_agent(llm, tools, prompt)
    return AgentExecutor(agent=agent, tools=tools, verbose=True, max_iterations=15)


def run_agent(prompt: str, user_id: str, resume_path: str) -> str:
    """
    Entry point for the placement agent.

    Args:
        prompt:      Natural language instruction from the user.
        user_id:     The authenticated student's ID.
        resume_path: Path (or filename) of the resume to attach.

    Returns:
        The agent's final text response.
    """
    try:
        enriched_prompt = (
            f"{prompt}\n\n"
            f"[Context] user_id={user_id}, resume_path={resume_path}"
        )
        executor = _build_agent_executor(user_id, resume_path)
        result = executor.invoke({"input": enriched_prompt})
        return result.get("output", "Agent finished without producing output.")
    except ValueError as e:
        logger.warning(f"Agent config error: {e}")
        return f"Agent is not configured: {str(e)}"
    except Exception as e:
        logger.error(f"Agent execution failed: {e}", exc_info=True)
        return f"Agent encountered an error: {str(e)}"
