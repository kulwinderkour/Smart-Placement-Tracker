from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import numpy as np

BASE_DIR = Path(__file__).resolve().parents[1]
MODEL_DIR = BASE_DIR / "models"
MATCHER_MODEL_PATH = MODEL_DIR / "profile_matcher.joblib"

logger = logging.getLogger(__name__)

_sentence_encoder = None
_matcher_artifact = None


def _normalize(text: str) -> str:
    return " ".join(text.lower().replace("_", " ").split())


def _load_sentence_encoder(model_name: str = "all-MiniLM-L6-v2"):
    global _sentence_encoder
    if _sentence_encoder is not None:
        return _sentence_encoder
    try:
        from sentence_transformers import SentenceTransformer
        _sentence_encoder = SentenceTransformer(model_name)
        logger.info("Sentence encoder '%s' loaded.", model_name)
    except Exception as exc:
        logger.warning("Could not load sentence encoder: %s", exc)
        _sentence_encoder = None
    return _sentence_encoder


def _load_matcher_artifact() -> dict | None:
    global _matcher_artifact
    if _matcher_artifact is not None:
        return _matcher_artifact
    if not MATCHER_MODEL_PATH.exists():
        return None
    try:
        import joblib
        _matcher_artifact = joblib.load(MATCHER_MODEL_PATH)
        logger.info("Profile matcher model loaded from %s", MATCHER_MODEL_PATH)
    except Exception as exc:
        logger.warning("Could not load profile matcher model: %s", exc)
        _matcher_artifact = None
    return _matcher_artifact


def _compute_semantic_sim(profile_text: str, job_text: str, encoder_name: str) -> float:
    encoder = _load_sentence_encoder(encoder_name)
    if encoder is None:
        return 0.5
    try:
        from sentence_transformers import util as st_util
        embs = encoder.encode([profile_text, job_text], convert_to_tensor=True)
        sim = float(st_util.cos_sim(embs[0], embs[1]).item())
        return max(0.0, min(1.0, sim))
    except Exception as exc:
        logger.warning("Semantic similarity computation failed: %s", exc)
        return 0.5


def _build_feature_vector(
    skill_match_ratio: float,
    role_keyword_match: float,
    semantic_sim: float,
    matched_count: int,
    n_required: int,
    profile_skill_count: int,
) -> np.ndarray:
    matched_skill_count_n = matched_count / n_required if n_required else 1.0
    profile_skill_density = min(profile_skill_count / n_required if n_required else 1.0, 2.0)
    return np.array([[
        skill_match_ratio,
        role_keyword_match,
        semantic_sim,
        matched_skill_count_n,
        profile_skill_density,
    ]], dtype=np.float32)


def compare_profile_with_job(
    resume_text: str,
    job_role: str,
    resume_skills: list[str],
    required_skills: list[str],
) -> dict[str, Any]:
    resume_text_norm = _normalize(resume_text)
    j_role = _normalize(job_role)

    role_match = bool(j_role and j_role in resume_text_norm)
    role_keyword_match = 1.0 if role_match else 0.0

    resume_set = {_normalize(s) for s in resume_skills if s and s.strip()}
    required_set = {_normalize(s) for s in required_skills if s and s.strip()}

    matched_skills = sorted(required_set & resume_set)
    missing_skills = sorted(required_set - resume_set)

    skill_match_ratio = round(
        len(matched_skills) / len(required_set) if required_set else 1.0, 3
    )

    artifact = _load_matcher_artifact()

    if artifact is not None:
        encoder_name = artifact.get("encoder_name", "all-MiniLM-L6-v2")
        job_text = (
            f"Position: {job_role}. Required skills: {', '.join(required_skills)}."
        )
        semantic_sim = _compute_semantic_sim(resume_text, job_text, encoder_name)

        features = _build_feature_vector(
            skill_match_ratio=skill_match_ratio,
            role_keyword_match=role_keyword_match,
            semantic_sim=semantic_sim,
            matched_count=len(matched_skills),
            n_required=len(required_set),
            profile_skill_count=len(resume_set),
        )

        try:
            raw_pred = float(artifact["model"].predict(features)[0])
            profile_match_pct = round(float(np.clip(raw_pred, 0.0, 100.0)), 1)
            method = "ml_model"
        except Exception as exc:
            logger.warning("ML model prediction failed, using rule-based: %s", exc)
            profile_match_pct = round((skill_match_ratio * 0.8 + role_keyword_match * 0.2) * 100, 1)
            semantic_sim = None
            method = "rule_based_fallback"
    else:
        semantic_sim = None
        profile_match_pct = round((skill_match_ratio * 0.8 + role_keyword_match * 0.2) * 100, 1)
        method = "rule_based"

    match = profile_match_pct >= 50.0

    result: dict[str, Any] = {
        "match": match,
        "profile_match_pct": profile_match_pct,
        "role_match": role_match,
        "skill_match_ratio": skill_match_ratio,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "method": method,
    }
    if semantic_sim is not None:
        result["semantic_sim"] = round(semantic_sim, 4)
    return result
