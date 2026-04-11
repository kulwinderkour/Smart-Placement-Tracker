"""
ai-engine/app/agent/auto_apply_agent.py

Creates the LangChain tool-calling agent executor and exposes
run_auto_apply_agent() for the API route to call.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_classic.agents import AgentExecutor, create_tool_calling_agent

from app.config import settings
from app.agent.intent_parser import parse_instruction
from app.agent.tools import (
    fetch_dashboard_jobs,
    filter_and_score_jobs,
    generate_application_description,
    submit_application,
    generate_final_summary,
)

logger = logging.getLogger(__name__)

_TOOLS = [
    fetch_dashboard_jobs,
    filter_and_score_jobs,
    generate_application_description,
    submit_application,
    generate_final_summary,
]

# ── System prompt ──────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """\
You are the Smart Placement Agent — an intelligent assistant that helps students \
automatically apply to suitable jobs posted by the college admin.

RULES (follow strictly, in every response):
1. Only use jobs returned by fetch_dashboard_jobs — never suggest external sources.
2. Always follow the 5-step workflow in order:
   Step 1 → fetch_dashboard_jobs        (get all active jobs)
   Step 2 → filter_and_score_jobs       (score + filter by intent and ML match)
   Step 3 → generate_application_description  (write personalised cover for each APPLY job)
   Step 4 → submit_application          (submit each APPLY job one by one)
   Step 5 → generate_final_summary      (produce a full run summary)
3. Parse the student's instruction FIRST to extract min_lpa and field_keywords \
   before fetching or filtering jobs.
4. The match score threshold for applying is 35%. Skip anything below this.
5. Generate a unique, personalised cover description for every individual job — \
   never reuse the same description across applications.
6. Be fully transparent about every decision: show match scores, \
   matched skills, gap skills, and the reason for APPLY or SKIP.
7. If no jobs match the student's intent or score threshold, clearly tell the \
   student which filters caused zero results and suggest relaxing criteria \
   (e.g. lower min_lpa, broader field, or no field filter).
8. Never apply to a job whose deadline has already passed.
9. Never apply to a job the student has already applied to — a 409 response \
   from submit_application means skip, not retry.
"""

# ── LLM factory with fallback ─────────────────────────────────────────────────

def _build_llm() -> Any:
    """
    Build the agent's LLM using a Gemini model that supports tool/function calling.

    NOTE: Gemma models (gemma-3-27b-it etc.) do NOT support function calling via
    the Google AI API — they will raise INVALID_ARGUMENT at the first tool-call step.
    Only Gemini models support tool calling.  Gemma is still used inside tools.py
    for text generation (generate_application_description) where no tool calling
    is required.

    Priority:
      1. AGENT_MODEL env var (override)
      2. gemini-2.0-flash  (default — fast, supports tool calling)
      3. gemini-1.5-flash  (fallback)
    """
    from langchain_google_genai import ChatGoogleGenerativeAI

    primary_model: str = (
        os.environ.get("AGENT_MODEL")
        or settings.GEMINI_MODEL
        or "gemini-2.0-flash"
    )
    api_key: str = (
        os.environ.get("GOOGLE_AI_API_KEY")
        or os.environ.get("GOOGLE_API_KEY")
        or os.environ.get("GEMINI_API_KEY")
        or settings.GOOGLE_AI_API_KEY
        or settings.GEMINI_API_KEY
        or ""
    )

    try:
        llm = ChatGoogleGenerativeAI(
            model=primary_model,
            google_api_key=api_key,
            temperature=0.1,
        )
        logger.info("Agent LLM initialised with model '%s'.", primary_model)
        return llm
    except Exception as exc:
        logger.warning(
            "Failed to initialise '%s' (%s) — falling back to gemini-1.5-flash.",
            primary_model, exc,
        )
        llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=api_key,
            temperature=0.1,
        )
        logger.info("Agent LLM initialised with fallback model 'gemini-1.5-flash'.")
        return llm


# ── Agent executor factory ────────────────────────────────────────────────────

def _build_executor() -> AgentExecutor:
    llm = _build_llm()

    prompt = ChatPromptTemplate.from_messages([
        ("system", _SYSTEM_PROMPT),
        ("human", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    agent = create_tool_calling_agent(llm=llm, tools=_TOOLS, prompt=prompt)

    return AgentExecutor(
        agent=agent,
        tools=_TOOLS,
        verbose=True,
        max_iterations=25,
        handle_parsing_errors=True,
        return_intermediate_steps=True,
    )


# ── Output parser ──────────────────────────────────────────────────────────────

def _parse_agent_output(
    raw_output: dict[str, Any],
    intent: dict[str, Any],
) -> dict[str, Any]:
    """
    Walk the intermediate_steps to reconstruct jobs_applied / jobs_skipped lists
    from submit_application and filter_and_score_jobs tool outputs.
    """
    jobs_applied: list[dict] = []
    jobs_skipped: list[dict] = []

    steps: list = raw_output.get("intermediate_steps", [])
    for action, observation in steps:
        tool_name: str = getattr(action, "tool", "")

        if tool_name == "submit_application":
            obs_str = str(observation)
            tool_input = getattr(action, "tool_input", {}) or {}
            job_id = tool_input.get("job_id", "unknown")

            if obs_str.startswith("✅"):
                jobs_applied.append({
                    "job_id": job_id,
                    "result": obs_str,
                })
            else:
                jobs_skipped.append({
                    "job_id": job_id,
                    "reason": obs_str,
                })

        elif tool_name == "filter_and_score_jobs":
            # Supplement skipped list with jobs that were filtered out before apply
            obs_str = str(observation)
            for line in obs_str.splitlines():
                if "❌ SKIP" in line:
                    parts = line.replace("❌ SKIP —", "").strip().split(" at ")
                    title = parts[0].strip() if parts else line.strip()
                    company = parts[1].strip() if len(parts) > 1 else ""
                    # Avoid duplicates already captured from submit_application
                    already_captured = any(
                        r.get("title") == title for r in jobs_skipped
                    )
                    if not already_captured:
                        jobs_skipped.append({"title": title, "company": company, "reason": "Filtered by scorer"})

    final_output: str = str(raw_output.get("output", "Agent run completed."))

    return {
        "success": True,
        "summary": final_output,
        "jobs_applied": jobs_applied,
        "jobs_skipped": jobs_skipped,
        "total_applied": len(jobs_applied),
        "total_skipped": len(jobs_skipped),
        "intent": intent,
    }


# ── Public API ─────────────────────────────────────────────────────────────────

def run_auto_apply_agent(
    instruction: str,
    student_token: str,
    student_profile: dict[str, Any],
    resume_url: str,
) -> dict[str, Any]:
    """
    Run the Smart Placement auto-apply agent end-to-end.

    Args:
        instruction    : Raw natural language instruction from the student,
                         e.g. "Apply to software jobs above 10 LPA in Bangalore"
        student_token  : Student's JWT bearer token for the apply API.
        student_profile: Dict with keys: fullName/name, college, branch,
                         cgpa, skills (list), experience (str, optional).
        resume_url     : Publicly accessible URL of the student's resume PDF.

    Returns:
        {
            success      : bool,
            summary      : str,
            jobs_applied : list[dict],
            jobs_skipped : list[dict],
            total_applied: int,
            total_skipped: int,
            intent       : dict,    # parsed intent for reference
            error        : str,     # only present on failure
        }
    """
    # ── Step 0: Parse the instruction (pure Python, no LLM needed) ────────────
    intent = parse_instruction(instruction)
    logger.info(
        "Auto-apply agent starting | instruction=%r | intent=%s",
        instruction, intent,
    )

    # ── Build rich user message ───────────────────────────────────────────────
    name = (
        student_profile.get("fullName")
        or student_profile.get("full_name")
        or student_profile.get("name")
        or "Student"
    )
    skills_str   = ", ".join(student_profile.get("skills") or []) or "Not provided"
    college      = student_profile.get("college", "Not provided")
    branch       = student_profile.get("branch", "Not provided")
    cgpa         = student_profile.get("cgpa", "Not provided")
    experience   = student_profile.get("experience", "") or "Fresher"
    locations    = ", ".join(intent.get("preferred_locations") or []) or "Any"

    profile_json  = json.dumps(student_profile, ensure_ascii=False)
    intent_json   = json.dumps(intent, ensure_ascii=False)

    user_message = f"""\
Student Instruction: {instruction}

[Parsed Intent]
  Minimum LPA        : {intent.get("min_lpa") or "No minimum set"}
  Field Keywords     : {", ".join(intent.get("field_keywords") or []) or "All fields (no filter)"}
  Preferred Locations: {locations}

[Student Profile]
  Name       : {name}
  College    : {college}
  Branch     : {branch}
  CGPA       : {cgpa}
  Skills     : {skills_str}
  Experience : {experience}

[Context]
  student_token : {student_token}
  resume_url    : {resume_url}

[Serialised data for tools]
  student_profile_json : {profile_json}
  intent_json          : {intent_json}

Please execute the full 5-step auto-apply workflow now:
1. Fetch all active jobs using fetch_dashboard_jobs.
2. Filter and score them using filter_and_score_jobs with the profile and intent above.
3. For each APPLY job, generate a unique cover description using generate_application_description.
4. Submit each application using submit_application with the student_token and resume_url above.
5. Call generate_final_summary with all results and return the formatted summary.
"""

    # ── Run the agent ─────────────────────────────────────────────────────────
    try:
        executor = _build_executor()
        raw_output = executor.invoke({"input": user_message})
        result = _parse_agent_output(raw_output, intent)
        logger.info(
            "Auto-apply agent finished | applied=%d skipped=%d",
            result["total_applied"], result["total_skipped"],
        )
        return result

    except Exception as exc:
        logger.exception("Auto-apply agent crashed: %s", exc)
        return {
            "success": False,
            "summary": f"Agent encountered an error: {exc}",
            "jobs_applied": [],
            "jobs_skipped": [],
            "total_applied": 0,
            "total_skipped": 0,
            "intent": intent,
            "error": str(exc),
        }
