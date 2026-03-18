import logging

import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)

# Load model once at startup — ~80MB, loads in ~3 seconds
try:
    model = SentenceTransformer("all-MiniLM-L6-v2")
    logger.info("Sentence transformer model loaded successfully")
except Exception as e:
    logger.error(f"Failed to load sentence transformer: {e}")
    model = None


def get_recommendations(
    student_skills: list[str],
    jobs: list[dict],
    top_n: int = 10,
) -> list[dict]:
    """
    Rank jobs by semantic similarity to student skill profile.
    Each job dict needs: {id, role_title, company_name, skills[]}
    Returns top_n jobs with match_pct added.
    """
    if not model:
        logger.error("Model not loaded — returning empty recommendations")
        return []

    if not student_skills or not jobs:
        return []

    student_text = " ".join(student_skills)
    job_texts = [
        f"{job.get('role_title', '')} {' '.join(job.get('skills', []))}" for job in jobs
    ]

    try:
        student_vec = model.encode([student_text])
        job_vecs = model.encode(job_texts)
        scores = cosine_similarity(student_vec, job_vecs)[0]
        ranked_indices = np.argsort(scores)[::-1][:top_n]

        return [
            {**jobs[i], "match_pct": round(float(scores[i]) * 100, 1)}
            for i in ranked_indices
            if scores[i] > 0.1
        ]
    except Exception as e:
        logger.error(f"Recommendation error: {e}")
        return []


def get_skill_gap(student_skills: list[str], job_skills: list[str]) -> dict:
    """
    Compare student skills vs job required skills.
    Returns missing skills and match percentage.
    """
    student_lower = {s.lower() for s in student_skills}
    job_lower = {s.lower(): s for s in job_skills}

    matched = [
        orig for skill_lower, orig in job_lower.items() if skill_lower in student_lower
    ]
    missing = [
        orig
        for skill_lower, orig in job_lower.items()
        if skill_lower not in student_lower
    ]

    match_pct = round(len(matched) / len(job_skills) * 100, 1) if job_skills else 0.0

    return {
        "match_pct": match_pct,
        "matched_skills": matched,
        "missing_skills": missing,
        "total_required": len(job_skills),
    }
