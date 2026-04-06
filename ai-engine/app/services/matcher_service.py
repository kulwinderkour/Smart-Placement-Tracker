from __future__ import annotations

from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parents[1]
MODEL_DIR = BASE_DIR / "models"
DATASET_PATH = BASE_DIR / "data" / "ResumesPDF"


def _normalize(text: str) -> str:
    return " ".join(text.lower().replace("_", " ").split())


def compare_profile_with_job(
    resume_text: str,
    job_role: str,
    resume_skills: list[str],
    required_skills: list[str],
) -> dict[str, Any]:
    resume_text_norm = _normalize(resume_text)
    j_role = _normalize(job_role)

    role_match = bool(j_role and j_role in resume_text_norm)

    resume_set = {_normalize(s) for s in resume_skills if s and s.strip()}
    required_set = {_normalize(s) for s in required_skills if s and s.strip()}

    matched_skills = sorted(required_set & resume_set)
    missing_skills = sorted(required_set - resume_set)

    skill_match_ratio = round(
        len(matched_skills) / len(required_set) if required_set else 1.0
        ,
        3,
    )

    role_score = 1.0 if role_match else 0.0
    profile_match_pct = round((skill_match_ratio * 0.8 + role_score * 0.2) * 100, 1)
    match = profile_match_pct >= 50.0

    return {
        "match": match,
        "profile_match_pct": profile_match_pct,
        "role_match": role_match,
        "skill_match_ratio": skill_match_ratio,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
    }
