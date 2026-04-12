"""
ai-engine/app/agent/auto_apply_agent.py

Direct auto-apply pipeline that bypasses LangChain agent reasoning for speed.
It calls endpoints directly and invokes the LLM only for description generation.
"""

from __future__ import annotations

import json
import logging
import os
import requests
from typing import Any

from app.config import settings

logger = logging.getLogger(__name__)

def generate_description_with_gemma(student: dict, job: dict, match: dict) -> str:
    """Generate a personalised cover description using Gemma."""
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
        temperature=0.7,
        max_output_tokens=320,
    )
    
    name = student.get("fullName") or student.get("name") or "I"
    skills = ", ".join(student.get("skills") or [])
    matched_skills = ", ".join(match.get("matched_skills") or [])
    gap_skills = ", ".join(match.get("gap_skills") or [])
    
    prompt = f"""Write a professional job application cover description in exactly 130-170 words.

Student: {name}
Education: {student.get('branch', '')} from {student.get('college', '')}, CGPA {student.get('cgpa', '')}
Skills: {skills}

Job: {job.get('title', '')} at {job.get('company', '')}
Required: {job.get('required_skills', '')}

Match Analysis:
Score: {match.get('score', 0)}%
Matched Skills: {matched_skills or 'None'}
Skills to Build: {gap_skills or 'None'}

Instructions:
- Write in first person as the student
- Highlight matched skills and how they apply to the role
- Acknowledge skill gaps briefly and express eagerness to grow
- End with a confident, professional call to action
- Output ONLY the cover description — no title, no heading, no bullet points"""

    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        return response.content.strip()
    except Exception as e:
        logger.warning(f"Gemma cover generation failed: {e}")
        return f"I am writing to express my eager interest in the {job.get('title', 'role')} position. With my background in {student.get('branch', 'engineering')} and skills in {skills}, I am a strong theoretical match and am highly motivated to quickly bridge any hands-on skill gaps. I have carefully reviewed the requirements and am ready to contribute immediately. Thank you for your time and consideration."


def run_auto_apply_agent(instruction, student_token, student_profile, resume_url):
    """Run the Smart Placement auto-apply pipeline (synchronous version)."""
    
    logger.info(f"Starting direct simple pipeline for instruction: {instruction}")

    # Step 1 — Parse intent (pure Python, no LLM)
    from app.agent.intent_parser import parse_instruction
    intent = parse_instruction(instruction)
    min_lpa = intent.get('min_lpa') or 0
    field_keywords = intent.get('field_keywords') or []

    # Step 2 — Fetch jobs directly (no LLM)
    backend_url = os.getenv("BACKEND_URL", "http://localhost:8000")
    try:
        response = requests.get(f"{backend_url}/api/v1/jobs", timeout=10) # Admin jobs are fetched here
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
    # match_scorer is inherently loaded/ready in our app module.

    qualifying_jobs = []
    skipped_jobs = []

    for job in all_jobs:
        job_id = job.get('id')
        title = job.get('role_title', '')
        company = job.get('company_name', '')
        
        # Package filter
        job_lpa_raw = job.get('salary_min') or 0
        try:
            val = float(job_lpa_raw)
            job_lpa = round(val / 100_000, 2) if val > 1000 else val
        except:
            job_lpa = 0.0

        if min_lpa > 0 and job_lpa < min_lpa:
            skipped_jobs.append({
                'job_id': job_id,
                'title': title,
                'company': company,
                'reason': f'Package {job_lpa} LPA below minimum {min_lpa} LPA'
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
        student_dict = {
            "name": student_profile.get("fullName") or "Student",
            "college": student_profile.get("college", ""),
            "branch": student_profile.get("branch", ""),
            "cgpa": float(student_profile.get("cgpa") or 0),
            "skills": student_profile.get("skills", []),
            "experience": student_profile.get("experience", ""),
        }
        
        job_dict = {
            "title": title,
            "company": company,
            "required_skills": [],
            "description": job.get("description", ""),
        }

        try:
            match_res = match_scorer.predict(student_dict, job_dict)
            match_score = match_res.get('match_score', 0)
        except:
            match_res = {'match_score': 0, 'matched_skills': [], 'gap_skills': []}
            match_score = 0

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
                f"{backend_url}/applications",
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
                applied_jobs.append({
                    'job_id': job['id'],
                    'title': job['title'],
                    'company': job['company'],
                    'match_score': match['match_score'],
                    'description': description,
                    'result': '✅ Successfully applied'
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

    # Step 5 — Build summary (no LLM)
    summary_lines = [f"Processed {len(all_jobs)} jobs. Applied to {len(applied_jobs)}. Skipped {len(skipped_jobs)}."]
    
    if applied_jobs:
        summary_lines.append(f"\nApplied to {len(applied_jobs)} job(s):")
        for a in applied_jobs:
            summary_lines.append(f"✓ {a['title']} at {a['company']} — {a['match_score']:.1f}% match")

    if skipped_jobs:
        summary_lines.append(f"\nSkipped {len(skipped_jobs)} job(s):")
        for s in skipped_jobs:
            summary_lines.append(f"✗ {s.get('title', 'Unknown')} — {s.get('reason', 'Skipped')}")

    return {
        "success": True,
        "summary": "\n".join(summary_lines),
        "jobs_applied": applied_jobs,
        "jobs_skipped": skipped_jobs,
        "total_applied": len(applied_jobs),
        "total_skipped": len(skipped_jobs)
    }
