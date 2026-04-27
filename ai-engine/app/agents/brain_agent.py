"""
brain_agent.py
--------------
Gemini 2.5 Flash Brain Agent — the first gate every user message passes through.

Architecture:
    User Input
    → BrainAgent.classify()          ← Gemini 2.5 Flash
    → BrainDecision (intent + action + entities + reply)
    → agent_routes.py routes to correct executor

Intents
-------
  greeting        → conversational reply only
  general_query   → conversational reply only
  job_search      → fetch + filter jobs, return list
  job_apply       → run full autonomous apply pipeline
  resume_update   → run resume extraction agent
  profile_query   → return profile data

Handles English / Hindi / Hinglish / mixed input.

RULES:
- predict() model is NEVER touched here.
- Only job_apply triggers the auto-apply pipeline.
- All other intents are handled without running applications.
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from app.core.gemini_client import GeminiClient, GeminiModel, get_gemini_client

logger = logging.getLogger(__name__)


# ── Intent taxonomy ───────────────────────────────────────────────────────────

class Intent(str, Enum):
    GREETING       = "greeting"       # hi, hello, namaste
    GENERAL_QUERY  = "general_query"  # who made you, what can you do
    JOB_SEARCH     = "job_search"     # show jobs, how many SDE jobs
    JOB_APPLY      = "job_apply"      # apply to SDE jobs above 8 LPA
    RESUME_UPDATE  = "resume_update"  # update my profile from resume
    PROFILE_QUERY  = "profile_query"  # what are my skills, my profile
    MEMORY_QUERY   = "memory_query"   # why didn't you apply to X, what failed, which jobs applied
    UNKNOWN        = "unknown"        # fallback


class Action(str, Enum):
    REPLY_ONLY      = "reply_only"       # greeting / general_query
    SEARCH_JOBS     = "search_jobs"      # job_search
    APPLY_JOBS      = "apply_jobs"       # job_apply   ← ONLY this triggers pipeline
    EXTRACT_RESUME  = "extract_resume"   # resume_update
    FETCH_PROFILE   = "fetch_profile"    # profile_query
    QUERY_MEMORY    = "query_memory"     # memory_query ← reads applications/traces, no pipeline
    FALLBACK_REPLY  = "fallback_reply"   # unknown


# ── Output dataclass ──────────────────────────────────────────────────────────

@dataclass
class BrainDecision:
    """Structured decision from the Brain Agent."""
    intent: Intent
    action: Action
    entities: dict[str, Any]          # salary_min_lpa, role, location, etc.
    reply: str                         # ready-to-send conversational reply
    confidence: float = 1.0
    parsed_by: str = "gemini"
    raw_instruction: str = ""
    needs_confirmation: bool = False   # True → ask user to confirm before applying


# ── Brain Agent ───────────────────────────────────────────────────────────────

class BrainAgent:
    """
    LLM-first orchestrator — classifies every message before any tool runs.

    Only job_apply intent dispatches the apply pipeline.
    Everything else returns a conversational reply or a lightweight tool call.
    """

    SYSTEM_PROMPT = """You are the Smart Placement Agent — an autonomous AI assistant for a college placement platform.

Your job is to understand what the student wants and classify it precisely.

INTENT CLASSIFICATION RULES:

1. greeting
   Triggers: hi, hello, hey, namaste, good morning, sup, wassup
   Action: reply_only
   Response: warm, friendly greeting

2. general_query
   Triggers: who made you, what can you do, help, explain yourself, tell me about yourself
   Action: reply_only
   Response: explain your capabilities

3. job_search
   Triggers: show jobs, list jobs, find jobs, how many jobs, jobs above X LPA, search for SDE jobs, kaun se jobs hain
   Action: search_jobs
   Response: acknowledge you will search
   NOTE: This is SEARCH only — do NOT apply to jobs

4. job_apply
   Triggers: apply to jobs, apply for SDE, auto apply, apply karo, apply kar, submit applications
   Pronoun triggers (CRITICAL): "apply in them", "apply to them", "apply to those", "apply to these",
     "apply for them", "them", "those", "these jobs", "that one", "this job", "inhe", "unhe", "inko", "unko"
     — these ALWAYS mean job_apply using the previously searched jobs from memory. NEVER re-search.
   Action: apply_jobs
   Response: confirm you will apply
   NOTE: This is the ONLY intent that triggers the application pipeline
   NOTE: When user says pronoun references (them/those/these), set entities to all nulls — do NOT carry over role/salary from history
   needs_confirmation: true ONLY when user says "apply all", "apply to all jobs", or similar blanket phrases with no specific filter

5. resume_update
   Triggers: update my profile, scan my resume, extract skills from resume, update from resume
   Action: extract_resume
   Response: confirm you will update

6. profile_query
   Triggers: what are my skills, show my profile, my education, my cgpa, meri profile
   Action: fetch_profile
   Response: acknowledge you will fetch
   NOTE: Do NOT use profile_query for questions about past agent actions (apply history, failures, skips)

7. memory_query
   Triggers: why didn't you apply to X, which jobs did you apply, what failed, what was skipped, why was Google skipped, show application history, kaunsi jobs pe apply hua, kyun reject hua, why am I not qualifying, why didn't the agent apply, what was the reason, explain why you skipped
   Action: query_memory
   Response: acknowledge you will check your memory
   NOTE: This reads stored application/trace data — NO new pipeline execution
   NOTE: "why didn't you apply", "why am I not qualifying", "what failed", "what was the reason" are ALWAYS memory_query — NEVER profile_query

CRITICAL RULES:
- NEVER classify a greeting as job_apply
- NEVER classify a search query as job_apply
- ONLY classify as job_apply when the user explicitly uses words like "apply", "submit", "apply karo"
- When unsure between job_search and job_apply, default to job_search
- Use memory_query when user asks about PAST agent actions: "why", "what happened", "which jobs applied", "what failed", "why skipped", "why not qualifying"
- NEVER use profile_query for "why didn't you apply" or "what failed" — those are memory_query
- Understand English, Hindi, Hinglish, and mixed language

ENTITY EXTRACTION (only for job_search and job_apply):
- salary_min_lpa: number (from "above 5 LPA", "5 se upar", "more than 8")
- salary_max_lpa: number (from "below 15 LPA", "15 tak")  
- role: string (SDE, Data Scientist, Product Manager)
- company: string (company name — from "Amazon jobs", "apply to Google", "TCS roles"). Lowercase only. Null if not mentioned.
- location: string
- job_type: full_time | intern | contract

Return a JSON object with EXACTLY these keys:
{
  "intent": "<one of: greeting|general_query|job_search|job_apply|resume_update|profile_query|memory_query|unknown>",
  "action": "<one of: reply_only|search_jobs|apply_jobs|extract_resume|fetch_profile|query_memory|fallback_reply>",
  "entities": {
    "salary_min_lpa": null,
    "salary_max_lpa": null,
    "role": null,
    "company": null,
    "location": null,
    "job_type": null
  },
  "reply": "<a short, natural conversational reply (1-2 sentences max)>",
  "confidence": <0.0-1.0>,
  "needs_confirmation": <true|false>
}

The "reply" field should be in the same language the user wrote in (English/Hindi/Hinglish)."""

    # JSON schema for Gemini structured output
    OUTPUT_SCHEMA = {
        "type": "object",
        "properties": {
            "intent":     {"type": "string", "enum": [i.value for i in Intent if i != Intent.UNKNOWN]},
            "action":     {"type": "string", "enum": [a.value for a in Action]},
            "entities": {
                "type": "object",
                "properties": {
                    "salary_min_lpa": {"type": ["number", "null"]},
                    "salary_max_lpa": {"type": ["number", "null"]},
                    "role":           {"type": ["string", "null"]},
                    "company":        {"type": ["string", "null"]},
                    "location":       {"type": ["string", "null"]},
                    "job_type":       {"type": ["string", "null"]},
                },
            },
            "reply":               {"type": "string"},
            "confidence":          {"type": "number"},
            "needs_confirmation":  {"type": "boolean"},
        },
        "required": ["intent", "action", "entities", "reply", "confidence", "needs_confirmation"],
    }

    def __init__(self):
        self.client: GeminiClient = get_gemini_client(
            model=GeminiModel.FLASH,
            temperature=0.1,   # low temp for classification consistency
        )

    async def classify(
        self,
        instruction: str,
        conversation_history: list[dict] | None = None,
    ) -> BrainDecision:
        """
        Classify the user instruction and return a BrainDecision.

        Args:
            instruction:           The latest user message.
            conversation_history:  Recent exchanges from Redis (list of
                                   {role, content} dicts, oldest first).
                                   Injected into the Gemini prompt so Gemini
                                   can resolve pronouns / follow-up questions.

        Falls back to rule-based classification if Gemini fails.
        """
        try:
            decision = await self._classify_with_gemini(instruction, conversation_history or [])
            if decision.confidence >= 0.5:
                logger.info(
                    f"[Brain] intent={decision.intent.value} "
                    f"action={decision.action.value} "
                    f"confidence={decision.confidence:.2f} "
                    f"parser=gemini history_turns={len(conversation_history or []) // 2}"
                )
                return decision
            logger.warning(
                f"[Brain] Low confidence {decision.confidence:.2f}, using rule-based fallback"
            )
        except Exception as e:
            logger.warning(f"[Brain] Gemini classification failed: {e}, using fallback")

        return self._classify_with_rules(instruction)

    # ── Gemini path ───────────────────────────────────────────────────────────

    @staticmethod
    def _build_history_block(history: list[dict]) -> str:
        """
        Format history list into a compact context block for the prompt.

        Agent turns include structured metadata so Gemini understands *what
        actually happened* — not just what was said:
          [tool=search_jobs | filters={role:sde,salary_min:5} | jobs=6 | status=success]
        """
        if not history:
            return ""
        lines = ["=== Conversation so far (oldest first) ==="]
        for entry in history:
            if entry.get("role") == "user":
                lines.append(f"Student: {entry.get('content', '')[:300]}")
            else:
                text = entry.get("content", "")[:300]
                meta = entry.get("metadata") or {}
                if meta:
                    tool    = meta.get("tool_used") or ""
                    filters = meta.get("filters_used") or {}
                    count   = meta.get("jobs_count", 0)
                    status  = meta.get("execution_status") or ""
                    parts = []
                    if tool:    parts.append(f"tool={tool}")
                    if filters: parts.append(f"filters={json.dumps(filters, separators=(',', ':'))}")
                    if count:   parts.append(f"jobs={count}")
                    if status:  parts.append(f"status={status}")
                    meta_str = f" [{' | '.join(parts)}]" if parts else ""
                else:
                    meta_str = ""
                lines.append(f"Agent{meta_str}: {text}")
        lines.append("=== End of history ===")
        return "\n".join(lines)

    async def _classify_with_gemini(
        self,
        instruction: str,
        conversation_history: list[dict] | None = None,
    ) -> BrainDecision:
        history_block = self._build_history_block(conversation_history or [])
        if history_block:
            full_prompt = f"{history_block}\n\nCurrent message: {instruction}"
        else:
            full_prompt = instruction

        response = await self.client.generate(
            prompt=full_prompt,
            system_prompt=self.SYSTEM_PROMPT,
            output_schema=self.OUTPUT_SCHEMA,
        )

        if not response.success or not response.structured_output:
            raise ValueError(f"Gemini brain failed: {response.error}")

        data = response.structured_output

        intent_str = data.get("intent", "unknown")
        action_str = data.get("action", "fallback_reply")

        # Safety: never accidentally dispatch apply from non-apply intents
        intent = self._safe_intent(intent_str)
        action = self._safe_action(action_str, intent)

        entities = data.get("entities") or {}

        return BrainDecision(
            intent=intent,
            action=action,
            entities={
                "salary_min_lpa": entities.get("salary_min_lpa"),
                "salary_max_lpa": entities.get("salary_max_lpa"),
                "role":           entities.get("role"),
                "location":       entities.get("location"),
                "job_type":       entities.get("job_type"),
            },
            reply=data.get("reply") or self._default_reply(intent),
            confidence=float(data.get("confidence", 0.9)),
            parsed_by="gemini",
            raw_instruction=instruction,
            needs_confirmation=bool(data.get("needs_confirmation", False)),
        )

    # ── Rule-based fallback ───────────────────────────────────────────────────

    # ── Word-boundary regex helper ─────────────────────────────────────────────

    @staticmethod
    def _wb(keyword: str, text: str) -> bool:
        """True if `keyword` appears as a whole word/phrase in `text`.
        Prevents 'software' matching 'hi', 'ship' matching 'apply', etc.
        """
        pattern = r"(?<![\w])" + re.escape(keyword) + r"(?![\w])"
        return bool(re.search(pattern, text))

    def _any_wb(self, keywords: set, text: str) -> bool:
        return any(self._wb(kw, text) for kw in keywords)

    def _classify_with_rules(self, instruction: str) -> BrainDecision:
        """Deterministic word-boundary keyword classification — Gemini fallback."""
        text = instruction.lower().strip()

        # ── Greeting — whole-word match + short message gate ─────────────────
        greet_kw = {"hi", "hello", "hey", "namaste", "good morning", "good evening",
                    "sup", "wassup", "hola", "yo"}
        if self._any_wb(greet_kw, text) and len(text.split()) <= 5:
            return self._make_simple(Intent.GREETING, Action.REPLY_ONLY,
                                     "Hey there! 👋 I'm the Smart Placement Agent. How can I help you today?",
                                     instruction)

        # ── Risky blanket-apply — needs confirmation ──────────────────────────
        blanket_apply_patterns = [r"apply all", r"apply to all", r"apply for all",
                                  r"sabhi jobs", r"sab jobs", r"all jobs apply"]
        if any(re.search(p, text) for p in blanket_apply_patterns):
            return self._make_simple(Intent.JOB_APPLY, Action.APPLY_JOBS,
                                     "I found jobs matching your profile. Confirm to apply to all?",
                                     instruction,
                                     needs_confirmation=True)

        # ── Pronoun-reference apply — "apply in them", "those", etc. ─────────
        from app.routes.agent_routes import _is_pronoun_apply
        if _is_pronoun_apply(text):
            return self._make_simple(Intent.JOB_APPLY, Action.APPLY_JOBS,
                                     "Got it! Applying to the jobs from your last search...",
                                     instruction)

        # ── Explicit apply intent — word-boundary on "apply" ──────────────────
        apply_kw = {"apply", "apply karo", "apply kar", "submit application",
                    "auto apply", "applications bhejo", "apply for"}
        if self._any_wb(apply_kw, text):
            return self._make_simple(Intent.JOB_APPLY, Action.APPLY_JOBS,
                                     "Got it! Starting the autonomous apply pipeline now...",
                                     instruction)

        # ── Search — word-boundary ────────────────────────────────────────────
        search_kw = {"show", "find", "search", "list", "how many", "kaun se",
                     "dikhao", "batao"}
        search_phrases = {"jobs above", "jobs in", "jobs for"}
        if self._any_wb(search_kw, text) or self._any_wb(search_phrases, text):
            return self._make_simple(Intent.JOB_SEARCH, Action.SEARCH_JOBS,
                                     "Searching for matching jobs...",
                                     instruction)

        # ── Profile query — phrase match ──────────────────────────────────────
        profile_kw = {"my skills", "my profile", "my cgpa", "my education",
                      "meri profile", "mere skills"}
        if self._any_wb(profile_kw, text):
            return self._make_simple(Intent.PROFILE_QUERY, Action.FETCH_PROFILE,
                                     "Fetching your profile...",
                                     instruction)

        # ── Resume update — phrase match ──────────────────────────────────────
        resume_kw = {"update my profile", "scan resume", "extract from resume",
                     "resume update", "upload resume"}
        if self._any_wb(resume_kw, text):
            return self._make_simple(Intent.RESUME_UPDATE, Action.EXTRACT_RESUME,
                                     "I'll update your profile from your resume.",
                                     instruction)

        # ── Memory query — past application / trace questions ─────────────────
        memory_kw = {
            "why didn't", "why not applied", "what failed", "what was skipped",
            "which jobs applied", "application history", "what happened",
            "kaunsi jobs pe apply", "kyun nahi", "kyun reject",
            "why skipped", "show applied", "list applied",
            "not qualifying", "why am i not", "why didn't you apply",
            "what was the reason", "explain why", "why was", "what went wrong",
        }
        if self._any_wb(memory_kw, text):
            return self._make_simple(Intent.MEMORY_QUERY, Action.QUERY_MEMORY,
                                     "Let me check my memory for you...",
                                     instruction)

        # ── General query fallback ────────────────────────────────────────────
        return self._make_simple(
            Intent.GENERAL_QUERY, Action.REPLY_ONLY,
            "I'm the Smart Placement Agent! I can help you find jobs, apply automatically, "
            "or update your profile. Just tell me what you'd like to do.",
            instruction,
            confidence=0.5,
            parsed_by="rules",
        )

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _safe_intent(self, raw: str) -> Intent:
        try:
            return Intent(raw)
        except ValueError:
            return Intent.UNKNOWN

    def _safe_action(self, raw: str, intent: Intent) -> Action:
        """Enforce that apply_jobs action only comes from job_apply intent."""
        try:
            action = Action(raw)
        except ValueError:
            action = Action.FALLBACK_REPLY

        # Safety guard: non-apply intents can NEVER dispatch apply_jobs
        if action == Action.APPLY_JOBS and intent != Intent.JOB_APPLY:
            logger.warning(
                f"[Brain] Safety guard triggered: action=apply_jobs blocked for intent={intent.value}"
            )
            action = Action.SEARCH_JOBS if intent == Intent.JOB_SEARCH else Action.REPLY_ONLY

        return action

    def _default_reply(self, intent: Intent) -> str:
        defaults = {
            Intent.GREETING:      "Hello! I'm the Smart Placement Agent. How can I help?",
            Intent.GENERAL_QUERY: "I help students find and apply to jobs automatically using AI.",
            Intent.JOB_SEARCH:    "Searching for jobs matching your criteria...",
            Intent.JOB_APPLY:     "Starting the autonomous apply pipeline...",
            Intent.RESUME_UPDATE: "I'll scan your resume and update your profile.",
            Intent.PROFILE_QUERY: "Let me fetch your profile details.",
            Intent.MEMORY_QUERY:  "Let me check my memory for you...",
            Intent.UNKNOWN:       "I'm not sure what you mean. Try: 'Apply to SDE jobs above 8 LPA'",
        }
        return defaults.get(intent, "How can I help?")

    def _make_simple(
        self,
        intent: Intent,
        action: Action,
        reply: str,
        instruction: str,
        confidence: float = 0.85,
        parsed_by: str = "rules",
        needs_confirmation: bool = False,
    ) -> BrainDecision:
        return BrainDecision(
            intent=intent,
            action=action,
            entities={
                "salary_min_lpa": None,
                "salary_max_lpa": None,
                "role": None,
                "location": None,
                "job_type": None,
            },
            reply=reply,
            confidence=confidence,
            parsed_by=parsed_by,
            raw_instruction=instruction,
            needs_confirmation=needs_confirmation,
        )

    # ── Memory query answer ─────────────────────────────────────────────────

    async def answer_from_memory(
        self,
        instruction: str,
        applications: list[dict],
        traces: list[dict],
    ) -> str:
        """
        Use Gemini to answer a memory_query from stored applications + traces.

        Returns a natural-language answer string ready to send to the student.
        Falls back to a deterministic summary if Gemini fails.
        """
        apps_block = self._build_applications_block(applications)
        traces_block = self._build_traces_block(traces)

        system = (
            "You are the Smart Placement Agent. Answer the student's question about their "
            "past job applications truthfully using ONLY the data provided below. "
            "If the data does not contain the answer, say so honestly. "
            "Be concise (3-5 sentences max). Respond in the same language as the question."
        )
        prompt = (
            f"{apps_block}\n\n{traces_block}\n\n"
            f"Student question: {instruction}"
        )
        try:
            response = await self.client.generate(prompt=prompt, system_prompt=system)
            if response.success and response.text:
                return response.text.strip()
        except Exception as e:
            logger.warning("[Brain] answer_from_memory Gemini failed: %s", e)

        # Deterministic fallback
        return self._deterministic_memory_answer(instruction, applications, traces)

    @staticmethod
    def _build_applications_block(applications: list[dict]) -> str:
        if not applications:
            return "=== Application History: None ==="
        lines = ["=== Application History (most recent last) ==="]
        for a in applications[-20:]:  # cap at 20 for prompt length
            status  = a.get("status", "unknown")
            title   = a.get("job_title") or a.get("title") or f"job#{a.get('job_id', '?')}"
            company = a.get("company") or "Unknown company"
            score   = a.get("match_score") or 0
            reason  = a.get("reason") or ""
            reason_str = f" | reason: {reason}" if reason else ""
            lines.append(f"  [{status.upper()}] {title} @ {company} | score: {score:.0f}{reason_str}")
        lines.append("=== End ===")
        return "\n".join(lines)

    @staticmethod
    def _build_traces_block(traces: list[dict]) -> str:
        if not traces:
            return "=== Execution Traces: None ==="
        lines = ["=== Recent Pipeline Traces ==="]
        for t in traces[-30:]:  # cap at 30
            detail = f" ({t['detail']})" if t.get("detail") else ""
            lines.append(f"  [{t.get('status','?').upper()}] {t.get('step','?')}{detail}")
        lines.append("=== End ===")
        return "\n".join(lines)

    @staticmethod
    def _deterministic_memory_answer(
        instruction: str,
        applications: list[dict],
        traces: list[dict],
    ) -> str:
        if not applications:
            return "I don't have any application history stored yet. Try running an apply pipeline first!"
        applied  = [a for a in applications if a.get("status") == "applied"]
        failed   = [a for a in applications if a.get("status") == "failed"]
        skipped  = [a for a in applications if a.get("status") in ("skipped", "duplicate")]
        parts = [f"Application summary: {len(applied)} applied, {len(failed)} failed, {len(skipped)} skipped."]
        if applied:
            names = ", ".join(
                (a.get("job_title") or f"job#{a.get('job_id','?')}") + " @ " + (a.get("company") or "?")
                for a in applied[:5]
            )
            parts.append(f"Applied to: {names}.")
        if failed:
            f_names = ", ".join(
                (a.get("job_title") or f"job#{a.get('job_id','?')}") +
                (f" (reason: {a['reason']})" if a.get("reason") else "")
                for a in failed[:5]
            )
            parts.append(f"Failed: {f_names}.")
        return " ".join(parts)


# ── Singleton ─────────────────────────────────────────────────────────────────

_brain_agent: BrainAgent | None = None


def get_brain_agent() -> BrainAgent:
    global _brain_agent
    if _brain_agent is None:
        _brain_agent = BrainAgent()
    return _brain_agent
