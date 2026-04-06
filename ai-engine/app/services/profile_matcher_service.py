from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parents[1]
MODEL_DIR = BASE_DIR / "models"
MATCHER_MODEL_PATH = MODEL_DIR / "profile_matcher.joblib"

_artifact: dict | None = None
_sentence_encoder = None


# ── singleton loaders ────────────────────────────────────────────────────────

def _load_artifact() -> dict:
    global _artifact
    if _artifact is not None:
        return _artifact

    if not MATCHER_MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Trained model not found at {MATCHER_MODEL_PATH}. "
            "Run train_profile_matcher.py first."
        )

    import joblib
    _artifact = joblib.load(MATCHER_MODEL_PATH)
    logger.info(
        "Profile matcher model loaded — version: %s",
        _artifact.get("version", "unknown"),
    )
    return _artifact


def _load_encoder(encoder_name: str):
    global _sentence_encoder
    if _sentence_encoder is not None:
        return _sentence_encoder

    from sentence_transformers import SentenceTransformer
    _sentence_encoder = SentenceTransformer(encoder_name)
    logger.info("Sentence encoder '%s' loaded.", encoder_name)
    return _sentence_encoder


def get_model_version() -> str:
    """Load artifact and return its version string."""
    artifact = _load_artifact()
    return str(artifact.get("version", "unknown"))


def reload_model() -> str:
    """
    Reset the in-memory singleton and reload the model from disk.

    Call this after the training script has written a new artifact file.
    Returns the version string of the freshly-loaded model.
    """
    global _artifact
    _artifact = None
    logger.info("Model singleton cleared — reloading from disk …")
    artifact = _load_artifact()
    version = str(artifact.get("version", "unknown"))
    logger.info("Model reloaded successfully — version: %s", version)
    return version


# ── text builders ────────────────────────────────────────────────────────────

def _build_profile_text(profile: dict) -> str:
    name = profile.get("name") or "The candidate"
    college = profile.get("college") or ""
    branch = profile.get("branch") or ""
    skills = profile.get("skills") or []
    experience = profile.get("experience") or ""

    parts: list[str] = []

    if branch and college:
        parts.append(f"{name} is a {branch} student from {college}.")
    elif college:
        parts.append(f"{name} is a student from {college}.")
    else:
        parts.append(f"{name} is a student.")

    if skills:
        parts.append(f"Skilled in {', '.join(skills[:8])}.")

    if experience:
        parts.append(f"Experience: {experience}.")

    return " ".join(parts)


def _build_job_text(job: dict) -> str:
    title = job.get("title") or job.get("job_role") or ""
    company = job.get("company") or job.get("company_name") or ""
    required_skills = job.get("required_skills") or []

    parts: list[str] = []

    if title and company:
        parts.append(f"Position: {title} at {company}.")
    elif title:
        parts.append(f"Position: {title}.")

    if required_skills:
        parts.append(f"Required skills: {', '.join(required_skills)}.")

    return " ".join(parts) or "Job opening."


# ── feature computation ──────────────────────────────────────────────────────

def _normalize(text: str) -> str:
    return " ".join(text.lower().replace("_", " ").split())


def _compute_features(
    profile_text: str,
    job_text: str,
    student_skills: list[str],
    required_skills: list[str],
    job_title: str,
    encoder,
    feature_names: list[str],
) -> tuple[np.ndarray, dict[str, float], list[str], list[str]]:
    student_set = {_normalize(s) for s in student_skills if s and s.strip()}
    required_set = {_normalize(s) for s in required_skills if s and s.strip()}

    matched = student_set & required_set
    missing = required_set - student_set

    n_required = len(required_set) or 1

    # Feature 0 — skill_match_ratio
    skill_match_ratio = len(matched) / n_required

    # Feature 1 — role_keyword_match
    role_keyword_match = 1.0 if (job_title and _normalize(job_title) in _normalize(profile_text)) else 0.0

    # Feature 2 — semantic_sim
    try:
        from sentence_transformers import util as st_util
        embs = encoder.encode([profile_text, job_text], convert_to_tensor=True)
        semantic_sim = float(
            max(0.0, min(1.0, st_util.cos_sim(embs[0], embs[1]).item()))
        )
    except Exception as exc:
        logger.warning("Semantic similarity failed, defaulting to 0.5: %s", exc)
        semantic_sim = 0.5

    # Feature 3 — matched_skill_count_n (absolute matched count normalised by required)
    matched_skill_count_n = len(matched) / n_required

    # Feature 4 — profile_skill_density
    profile_skill_density = min(len(student_set) / n_required, 2.0)

    feature_vector = np.array([[
        skill_match_ratio,
        role_keyword_match,
        semantic_sim,
        matched_skill_count_n,
        profile_skill_density,
    ]], dtype=np.float32)

    raw_values = [
        skill_match_ratio,
        role_keyword_match,
        semantic_sim,
        matched_skill_count_n,
        profile_skill_density,
    ]
    feature_values = {
        name: round(float(val), 4)
        for name, val in zip(feature_names, raw_values)
    }

    matched_skills = sorted(required_set & student_set)
    gap_skills = sorted(missing)

    return feature_vector, feature_values, matched_skills, gap_skills


def _match_label(score: float) -> str:
    if score >= 80:
        return "Excellent Match"
    if score >= 60:
        return "Good Match"
    if score >= 40:
        return "Moderate Match"
    if score >= 20:
        return "Weak Match"
    return "Poor Match"


# ── public API ───────────────────────────────────────────────────────────────

def predict(student_profile: dict[str, Any], job: dict[str, Any]) -> dict[str, Any]:
    """
    Predict how well a student profile matches a job posting.

    Args:
        student_profile: dict with keys — name, college, branch, skills (list),
                         experience (str, optional)
        job: dict with keys — title (or job_role), company (or company_name),
             required_skills (list)

    Returns:
        {
            match_score: float (0–100),
            match_label: str,
            matched_skills: list[str],
            gap_skills: list[str],
            feature_values: dict[str, float],
        }
    """
    artifact = _load_artifact()
    encoder = _load_encoder(artifact["encoder_name"])

    student_skills: list[str] = list(student_profile.get("skills") or [])
    required_skills: list[str] = list(job.get("required_skills") or [])
    job_title: str = (job.get("title") or job.get("job_role") or "").strip()

    profile_text = _build_profile_text(student_profile)
    job_text = _build_job_text(job)

    feature_vector, feature_values, matched_skills, gap_skills = _compute_features(
        profile_text=profile_text,
        job_text=job_text,
        student_skills=student_skills,
        required_skills=required_skills,
        job_title=job_title,
        encoder=encoder,
        feature_names=artifact["feature_names"],
    )

    raw = float(artifact["model"].predict(feature_vector)[0])
    match_score = round(float(np.clip(raw, 0.0, 100.0)), 1)

    return {
        "match_score": match_score,
        "match_label": _match_label(match_score),
        "matched_skills": matched_skills,
        "gap_skills": gap_skills,
        "feature_values": feature_values,
    }
