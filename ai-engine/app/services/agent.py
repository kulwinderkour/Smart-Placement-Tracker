import logging

from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import settings
from app.services.tools import apply_to_job, get_application_summary, get_jobs_above_lpa

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are an intelligent placement assistant for SmartPlacementTrackr. "
    "Your job is to help students automatically apply to suitable job opportunities. "
    "When asked to apply to jobs above a certain LPA, you must:\n"
    "1. Call get_jobs_above_lpa to fetch qualifying jobs.\n"
    "2. For each qualifying job, call apply_to_job with the job ID, user ID, and resume path.\n"
    "3. Finally, call get_application_summary to summarise all applications made.\n"
    "Be concise, accurate, and always confirm what actions you took."
)


def _build_agent_executor(user_id: str, resume_path: str) -> AgentExecutor:
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not set in the environment.")

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=settings.GEMINI_API_KEY,
        temperature=0,
    )

    tools = [get_jobs_above_lpa, apply_to_job, get_application_summary]

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
