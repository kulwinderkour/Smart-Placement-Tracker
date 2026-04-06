from __future__ import annotations

from pathlib import Path
from typing import Any

from app.services.explanation_service import generate_explanation
from app.services.matcher_service import compare_profile_with_job
from app.services.resume_parser import parse_resume
from app.services.skill_extractor import extract_skills_from_text

BASE_DIR = Path(__file__).resolve().parents[1]
DATASET_PATH = BASE_DIR / "data" / "ResumesPDF"


def _load_resume_text(resume_text: str | None, resume_path: str | None) -> str:
    if resume_text and resume_text.strip():
        return resume_text.strip()

    if not resume_path:
        raise ValueError("Either resume_text or resume_path is required")

    path = Path(resume_path)
    if not path.is_absolute():
        path = DATASET_PATH / path
    if not path.exists():
        raise FileNotFoundError(f"Resume path not found: {resume_path}")

    suffix = path.suffix.lower()
    if suffix in {".pdf", ".docx"}:
        file_bytes = path.read_bytes()
        text = parse_resume(file_bytes, path.name)
        if not text:
            raise ValueError("Could not parse resume file content")
        return text

    text = path.read_text(encoding="utf-8", errors="ignore").strip()
    if not text:
        raise ValueError("Resume text file is empty")
    return text


def _extract_skill_names(resume_text: str) -> list[str]:
    extracted = extract_skills_from_text(resume_text)
    return [item["name"] for item in extracted if item.get("name")]


def run_resume_match_agent(
    *,
    job_role: str,
    required_skills: list[str],
    resume_text: str | None = None,
    resume_path: str | None = None,
) -> dict[str, Any]:
    text = _load_resume_text(resume_text=resume_text, resume_path=resume_path)

    resume_skills = _extract_skill_names(text)
    comparison = compare_profile_with_job(
        resume_text=text,
        job_role=job_role,
        resume_skills=resume_skills,
        required_skills=required_skills,
    )

    payload = {
        "match": comparison["match"],
        "profile_match_pct": comparison["profile_match_pct"],
        "job_role": job_role,
        "role_match": comparison["role_match"],
        "matched_skills": comparison["matched_skills"],
        "missing_skills": comparison["missing_skills"],
    }
    explanation = generate_explanation(payload)

    result = {
        "match": comparison["match"],
        "profile_match_pct": comparison["profile_match_pct"],
        "role_match": comparison["role_match"],
        "skill_match_ratio": comparison["skill_match_ratio"],
        "matched_skills": comparison["matched_skills"],
        "missing_skills": comparison["missing_skills"],
        "resume_skills": resume_skills,
        "explanation": explanation,
        "method": comparison.get("method", "rule_based"),
    }
    if "semantic_sim" in comparison:
        result["semantic_sim"] = comparison["semantic_sim"]
    return result
