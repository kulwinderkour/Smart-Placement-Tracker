"""
ai-engine/app/agent/auto_apply_agent.py

Direct auto-apply pipeline that bypasses LangChain agent reasoning for speed.
It calls endpoints directly and invokes the LLM only for description generation.
"""

from __future__ import annotations

import logging
import os
import requests
from typing import Any

from app.config import settings

logger = logging.getLogger(__name__)


def _backend_api_v1_base() -> str:
    """
    Normalize BACKEND_URL to .../api/v1 whether the env includes /api/v1 or not.
    """
    raw = (os.getenv("BACKEND_URL") or settings.BACKEND_URL or "http://localhost:8000").rstrip("/")
    if raw.endswith("/api/v1"):
        return raw
    return f"{raw}/api/v1"


def _normalize_required_skills(raw: Any) -> list[str]:
    """Coerce API shapes (list, comma-separated string, or missing) to a list of strings."""
    if raw is None:
        return []
    if isinstance(raw, str):
        parts = raw.replace(";", ",").split(",")
        return [p.strip() for p in parts if p.strip()]
    if isinstance(raw, list):
        out: list[str] = []
        for item in raw:
            if isinstance(item, str) and item.strip():
                out.append(item.strip())
            elif isinstance(item, dict):
                name = (item.get("name") or item.get("skill") or "").strip()
                if name:
                    out.append(name)
        return out
    return []


def _word_count(text: str) -> int:
    return len([w for w in (text or "").replace("/", " ").split() if w.strip()])


def _format_required_for_prompt(job: dict) -> str:
    raw = job.get("required_skills")
    if raw is None:
        return ""
    if isinstance(raw, str):
        return raw.strip()
    if isinstance(raw, list):
        return ", ".join(str(x).strip() for x in raw if str(x).strip())
    return str(raw)


def _extract_llm_text(response: Any) -> str:
    content = getattr(response, "content", None)
    if content is None and hasattr(response, "text"):
        content = getattr(response, "text", None)
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict):
                t = block.get("text")
                if isinstance(t, str):
                    parts.append(t)
            elif hasattr(block, "text"):
                parts.append(str(getattr(block, "text", "") or ""))
        return " ".join(parts).strip()
    return str(content or "").strip()


def _fallback_cover_letter(student: dict, job: dict, match: dict) -> str:
    """Deterministic 70+ word cover letter when the LLM returns nothing or too little."""
    name = student.get("fullName") or student.get("name") or "I"
    role = job.get("title", "this role")
    company = job.get("company", "your organization")
    branch = student.get("branch", "engineering")
    college = student.get("college", "") or "my institution"
    cgpa = student.get("cgpa", "")
    skills = student.get("skills") or []
    skill_str = ", ".join(str(s) for s in skills[:8]) if skills else "strong analytical and technical foundations"
    matched = ", ".join(match.get("matched_skills") or []) or "the technical expectations outlined for the role"
    gaps = ", ".join(match.get("gap_skills") or []) or "a few specialized tools"
    score = match.get("match_score", match.get("score", 0))
    return (
        f"I am writing to express my strong interest in the {role} position at {company}. "
        f"As a {branch} student from {college} with a CGPA of {cgpa}, I bring enthusiasm, discipline, "
        f"and hands-on experience across {skill_str}. I was encouraged to see alignment with {matched}, "
        f"and I am actively strengthening areas such as {gaps} through coursework and personal projects. "
        f"I enjoy collaborating, learning quickly, and translating requirements into clear, user-focused outcomes. "
        f"I would welcome the opportunity to discuss how my profile — including an estimated match strength of "
        f"{score}% against this posting — can support your team. Thank you for considering my application; "
        f"I look forward to contributing to {company} and growing alongside your organization."
    )


def generate_description_with_gemma(student: dict, job: dict, match: dict) -> str:
    """Generate a personalised cover letter via Gemini; enforce at least ~65 words."""
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_core.messages import HumanMessage

    api_key = (
        os.environ.get("GOOGLE_AI_API_KEY")
        or os.environ.get("GEMINI_API_KEY")
        or settings.GOOGLE_AI_API_KEY
        or settings.GEMINI_API_KEY
    )
    model = os.environ.get("GEMINI_MODEL") or settings.GEMINI_MODEL or "gemini-2.5-flash"

    llm = ChatGoogleGenerativeAI(
        model=model,
        google_api_key=api_key,
        temperature=0.65,
        max_output_tokens=1024,
    )

    name = student.get("fullName") or student.get("name") or "I"
    skills = ", ".join(str(s) for s in (student.get("skills") or []))
    matched_skills = ", ".join(match.get("matched_skills") or [])
    gap_skills = ", ".join(match.get("gap_skills") or [])
    required_line = _format_required_for_prompt(job)

    prompt = f"""Write ONE professional job-application cover letter as a single paragraph (no title, no bullets).

Hard requirements:
- Minimum 65 words; target 70–95 words.
- First person as the student.
- Mention the role and company by name.
- Reference relevant skills and how they apply; briefly acknowledge gaps and willingness to learn.
- End with a short call to action.

Student: {name}
Education: {student.get('branch', '')} from {student.get('college', '')}, CGPA {student.get('cgpa', '')}
Skills: {skills}

Job: {job.get('title', '')} at {job.get('company', '')}
Required skills / expectations: {required_line or 'See posting'}

Match analysis:
Score: {match.get('match_score', match.get('score', 0))}%
Matched skills: {matched_skills or 'None listed'}
Skills to strengthen: {gap_skills or 'None listed'}

Output ONLY the cover letter paragraph — nothing else."""

    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        text = _extract_llm_text(response)
        if _word_count(text) < 60:
            logger.warning(
                "Gemini cover letter short (%s words); using expanded fallback",
                _word_count(text),
            )
            return _fallback_cover_letter(student, job, match)
        return text
    except Exception as e:
        logger.warning(f"Gemini cover generation failed: {e}")
        return _fallback_cover_letter(student, job, match)


def run_auto_apply_agent(instruction, student_token, student_profile, resume_url):
    """Run the Smart Placement auto-apply pipeline (synchronous version)."""
    
    logger.info(f"Starting direct simple pipeline for instruction: {instruction}")

    # Step 1 — Parse intent (pure Python, no LLM)
    from app.agent.intent_parser import parse_instruction
    intent = parse_instruction(instruction)
    extracted_lpa = intent.get('min_lpa') or 0
    field_keywords = intent.get('field_keywords') or []

    # Handle "below", "under", "less than" explicitly since parser defaults to min_lpa
    is_max_lpa = any(kw in instruction.lower() for kw in ['below', 'under', 'less than', 'max'])
    min_lpa = 0 if is_max_lpa else extracted_lpa
    max_lpa = extracted_lpa if is_max_lpa else float('inf')

    # Step 2 — Fetch jobs (same source as student dashboard: includes description for matcher)
    api_base = _backend_api_v1_base()
    logger.info(f"[auto_apply_agent] Using backend api_base={api_base}")

    try:
        response = requests.get(
            f"{api_base}/student/jobs",
            params={"limit": 100},
            timeout=15,
        )
        jobs_res = response.json()
        all_jobs = jobs_res.get('data', []) if isinstance(jobs_res, dict) else jobs_res
    except Exception as e:
        return {
            "success": False,
            "summary": f"Could not fetch jobs from backend: {e}",
            "jobs_applied": [],
            "jobs_skipped": [],
            "total_applied": 0,
            "total_skipped": 0
        }

    if not all_jobs:
        return {
            "success": True,
            "summary": "No active jobs currently posted by admin.",
            "jobs_applied": [],
            "jobs_skipped": [],
            "total_applied": 0,
            "total_skipped": 0
        }

    # Step 3 — Filter and score jobs (no LLM — uses trained model)
    from app.services import profile_matcher_service as match_scorer

    # Force-reload the model to pick up any retraining done since last run
    try:
        match_scorer.reload_model()
        logger.info("Model reloaded successfully for agent run")
    except Exception as reload_err:
        logger.warning(f"Model reload failed (will try with existing): {reload_err}")

    # Normalize skills ONCE outside the loop — they may be plain strings or {name, level} objects
    raw_skills = student_profile.get("skills") or []
    normalized_skills = [
        s if isinstance(s, str) else (s.get("name") or s.get("skill") or "")
        for s in raw_skills
    ]
    normalized_skills = [s.strip() for s in normalized_skills if s and s.strip()]
    logger.info(f"Agent normalized student skills: {normalized_skills}")

    student_dict = {
        "name": student_profile.get("fullName") or student_profile.get("full_name") or "Student",
        "college": student_profile.get("college", ""),
        "branch": student_profile.get("branch", ""),
        "cgpa": float(student_profile.get("cgpa") or 0),
        "skills": normalized_skills,
        "experience": student_profile.get("experience", ""),
    }

    qualifying_jobs = []
    skipped_jobs = []

    for job in all_jobs:
        job_id = job.get('id')
        title = job.get('role_title') or job.get('title') or ''
        company = job.get('company_name') or job.get('company') or ''
        
        # Package filter
        job_lpa_raw = job.get('salary_min') or 0
        try:
            val = float(job_lpa_raw)
            job_lpa = round(val / 100_000, 2) if val > 1000 else val
        except (TypeError, ValueError):
            job_lpa = 0.0

        if min_lpa > 0 and job_lpa < min_lpa:
            skipped_jobs.append({
                'job_id': job_id,
                'title': title,
                'company': company,
                'reason': f'Package {job_lpa} LPA below minimum {min_lpa} LPA'
            })
            continue

        if max_lpa < float('inf') and job_lpa > max_lpa:
            skipped_jobs.append({
                'job_id': job_id,
                'title': title,
                'company': company,
                'reason': f'Package {job_lpa} LPA above maximum {max_lpa} LPA'
            })
            continue

        # Field filter
        if field_keywords:
            job_text = f"{title} {job.get('description', '')}".lower()
            if not any(kw.lower() in job_text for kw in field_keywords):
                skipped_jobs.append({
                    'job_id': job_id,
                    'title': title,
                    'company': company,
                    'reason': 'Job field does not match instruction intent'
                })
                continue

        # Match score using trained model
        job_dict = {
            "title": title,
            "company": company,
            "required_skills": _normalize_required_skills(job.get("required_skills")),
            "description": job.get("description") or "",
            "job_type": job.get("job_type") or "",
            "company_type": job.get("company_type") or "",
        }

        try:
            match_res = match_scorer.predict(student_dict, job_dict)
            match_score = match_res.get('match_score', 0)
            logger.info(f"Match score for '{title}' at '{company}': {match_score}% | skills: {match_res.get('matched_skills', [])}")
        except Exception as score_err:
            logger.error(f"ML scorer FAILED for job '{title}': {score_err}", exc_info=True)
            # Fallback: use CGPA-based minimum score instead of hard 0
            cgpa = float(student_profile.get("cgpa") or 0)
            fallback_score = max(0.0, (cgpa - 7.0) / 3.0 * 25.0) if cgpa >= 7.0 else 0.0
            match_res = {
                'match_score': round(fallback_score, 1),
                'matched_skills': [],
                'gap_skills': [],
                'error': str(score_err)
            }
            match_score = fallback_score

        if match_score < 35:
            skipped_jobs.append({
                'job_id': job_id,
                'title': title,
                'company': company,
                'reason': f'Match score {match_score:.1f}% below 35% threshold'
            })
            continue

        job['title'] = title
        job['company'] = company
        qualifying_jobs.append({'job': job, 'match': match_res})

    # Step 4 — Generate descriptions and apply (LLM called ONCE per qual job)
    applied_jobs = []

    for item in qualifying_jobs:
        job = item['job']
        match = item['match']
        
        try:
            # Generate description using Gemma
            description = generate_description_with_gemma(
                student=student_profile,
                job=job,
                match=match
            )

            # Submit application
            apply_response = requests.post(
                f"{api_base}/applications",
                json={
                    "job_id": str(job['id']),
                    "resume_url": resume_url,
                    "cover_letter": description,
                    "agent_applied": True
                },
                headers={"Authorization": f"Bearer {student_token}"},
                timeout=10
            )

            if apply_response.status_code in (200, 201):
                app_body: dict[str, Any] = {}
                try:
                    app_body = apply_response.json()
                except Exception:
                    pass
                app_id = app_body.get("id")
                applied_jobs.append({
                    'job_id': job['id'],
                    'application_id': str(app_id) if app_id else '',
                    'title': job['title'],
                    'company': job['company'],
                    'match_score': match['match_score'],
                    'description': description,
                    'result': (
                        'Application submitted successfully. '
                        'It is saved in the system and visible to administrators for this job.'
                    ),
                })
            elif apply_response.status_code == 409:
                skipped_jobs.append({
                    'job_id': job['id'],
                    'title': job['title'],
                    'company': job['company'],
                    'reason': 'Already applied to this job'
                })
            else:
                skipped_jobs.append({
                    'job_id': job['id'],
                    'title': job['title'],
                    'company': job['company'],
                    'reason': f"Failed to apply: HTTP {apply_response.status_code}"
                })

        except Exception as e:
            skipped_jobs.append({
                'job_id': job['id'],
                'title': job['title'],
                'company': job['company'],
                'reason': f'Error: {str(e)}'
            })

    # Step 5 — Build summary (no LLM; omit per-job skip reasons — UI only shows successful applies)
    ns = len(skipped_jobs)
    na = len(applied_jobs)
    if applied_jobs:
        summary_lines = [
            f"Applied to {na} job(s). Each submission is stored and appears in the admin applicants list.",
            "Successful matches:",
        ]
        for a in applied_jobs:
            ref = f" (application id: {a['application_id']})" if a.get("application_id") else ""
            summary_lines.append(f"✓ {a['title']} at {a['company']} — {a['match_score']:.1f}% match{ref}")
        if ns:
            summary_lines.append(
                f"\n{ns} other open role(s) did not meet your filters or match threshold (details omitted)."
            )
    else:
        summary_lines = [
            "No applications were submitted.",
            f"Scanned {len(all_jobs)} open role(s); none satisfied your instruction and eligibility together.",
        ]
        if ns:
            summary_lines.append(
                f"{ns} listing(s) were filtered out automatically (not shown in the chat)."
            )

    return {
        "success": True,
        "summary": "\n".join(summary_lines),
        "jobs_applied": applied_jobs,
        "jobs_skipped": skipped_jobs,
        "total_applied": len(applied_jobs),
        "total_skipped": len(skipped_jobs),
    }
