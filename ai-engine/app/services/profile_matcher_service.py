from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity as sk_cosine_sim

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parents[1]
MODEL_DIR = BASE_DIR / "models"
MATCHER_MODEL_PATH = MODEL_DIR / "profile_matcher.joblib"

_artifact: dict | None = None


# ── singleton loaders ────────────────────────────────────────────────────────

def _load_artifact() -> dict:
    global _artifact
    if _artifact is not None:
        return _artifact

    fallback_feature_names = [
        "skill_match_ratio",
        "role_keyword_match",
        "semantic_sim",
        "matched_skill_count_n",
        "profile_skill_density",
    ]

    if not MATCHER_MODEL_PATH.exists():
        logger.warning(
            "Trained model not found at %s — using fallback matcher artifact.",
            MATCHER_MODEL_PATH,
        )
        _artifact = {
            "version": "fallback-no-model",
            "feature_names": fallback_feature_names,
            "scaler": None,
            "model_loaded": False,
        }
        return _artifact

    try:
        import joblib
        _artifact = joblib.load(MATCHER_MODEL_PATH)
        logger.info(
            "Profile matcher model loaded — version: %s",
            _artifact.get("version", "unknown"),
        )
        # Ensure required keys exist even for older artifacts
        _artifact.setdefault("feature_names", fallback_feature_names)
        _artifact.setdefault("scaler", None)
        _artifact["model_loaded"] = True
    except Exception as exc:
        # Some historical joblib artifacts can become unloadable if they reference
        # modules/classes not present in the runtime (e.g. pickled private modules).
        logger.error("Model load failed — using fallback artifact: %s", exc, exc_info=True)
        _artifact = {
            "version": "fallback-load-failed",
            "feature_names": fallback_feature_names,
            "scaler": None,
            "model_loaded": False,
            "load_error": str(exc),
        }
    return _artifact



def _tfidf_similarity(text1: str, text2: str) -> float:
    """Offline TF-IDF cosine similarity — no network required."""
    try:
        vec = TfidfVectorizer(ngram_range=(1, 2), stop_words="english", min_df=1)
        mat = vec.fit_transform([text1, text2])
        return float(np.clip(sk_cosine_sim(mat[0:1], mat[1:2])[0][0], 0.0, 1.0))
    except Exception as exc:
        logger.warning("TF-IDF similarity failed: %s", exc)
        return 0.3


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
    cgpa = profile.get("cgpa") or 0

    parts: list[str] = []

    if branch and college:
        parts.append(f"{name} is a {branch} engineering student from {college}.")
    elif branch:
        parts.append(f"{name} is a {branch} student.")
    else:
        parts.append(f"{name} is a student.")

    if cgpa:
        parts.append(f"Academic CGPA {cgpa} out of 10.")

    if skills:
        parts.append(f"Skilled in {', '.join(skills[:8])}.")

    if experience:
        parts.append(f"Experience: {experience}.")

    return " ".join(parts)


def _build_job_text(job: dict) -> str:
    title = job.get("title") or job.get("job_role") or ""
    company = job.get("company") or job.get("company_name") or ""
    required_skills = job.get("required_skills") or []
    description = (job.get("description") or "").strip()

    parts: list[str] = []

    if title and company:
        parts.append(f"Position: {title} at {company}.")
    elif title:
        parts.append(f"Position: {title}.")

    if required_skills:
        parts.append(f"Required skills: {', '.join(required_skills)}.")

    if description:
        parts.append(description[:600])

    return " ".join(parts) or "Job opening."


# ── feature computation ──────────────────────────────────────────────────────

# Generic words stripped from job titles before keyword matching.
# These are role/seniority words that appear across ALL fields — what remains
# after stripping is the domain keyword used to match against the student.
# e.g. "Financial Analyst" → {"financial"}, "Mechanical Engineer" → {"mechanical"}
_TITLE_STOP_WORDS: frozenset[str] = frozenset({
    # ── seniority / level ────────────────────────────────────────────────────
    "senior", "junior", "associate", "lead", "principal", "staff", "head",
    "chief", "officer", "director", "vp", "vice", "president", "executive",
    "entry", "mid", "level",
    # ── generic role nouns (apply across all fields) ─────────────────────────
    "engineer", "developer", "manager", "analyst", "specialist", "consultant",
    "architect", "coordinator", "administrator", "supervisor", "representative",
    "advisor", "assistant", "executive", "intern", "trainee", "apprentice",
    "associate", "officer", "lead", "technician", "operator", "controller",
    "planner", "strategist", "researcher", "scientist", "expert", "professional",
    # ── filler / prepositions ────────────────────────────────────────────────
    "and", "the", "of", "in", "at", "for", "with", "to", "a", "an",
    "role", "position", "job", "opening", "vacancy",
})


def _normalize(text: str) -> str:
    return " ".join(text.lower().replace("_", " ").split())


def _safe_skill_name(s: Any) -> str:
    """Extract a plain skill name string regardless of input type."""
    if isinstance(s, str):
        return s.strip()
    if isinstance(s, dict):
        return str(s.get("name", "")).strip()
    if hasattr(s, "name"):
        return str(s.name).strip()
    return ""


def _title_keyword_score(
    job_title: str,
    student_skills: list[str],
    branch: str,
) -> float:
    """
    Match tech keywords from the job title against the student's skills + branch.
    Returns a ratio 0-1: fraction of title keywords found in student profile.

    Example: title='Machine Learning Engineer'
      keywords = {'machine', 'learning'}  (after removing _TITLE_STOP_WORDS)
      student tokens include 'machine','learning' from their ML skill → score = 1.0
    """
    if not job_title:
        return 0.0

    title_normalized = _normalize(job_title)
    title_words = set(title_normalized.split()) - _TITLE_STOP_WORDS

    # Build token set from student skills + branch (split multi-word entries)
    student_tokens: set[str] = set()
    for s in student_skills:
        name = _safe_skill_name(s)
        if name:
            student_tokens.update(_normalize(name).split())
    if branch:
        student_tokens.update(_normalize(branch).split())

    # When ALL title words are stop words (e.g. "Software Engineer", "SDE Intern"),
    # the title is a generic role. Check if student branch/skills are tech-related.
    if not title_words:
        # These words in the ORIGINAL title + student branch indicate a tech role match
        tech_indicators = {"software", "sde", "swe", "fullstack", "full-stack",
                           "frontend", "backend", "devops", "cloud", "data", "ml",
                           "ai", "web", "mobile", "ios", "android", "qa", "test"}
        title_has_tech = bool(set(title_normalized.split()) & tech_indicators)
        branch_is_tech = any(kw in _normalize(branch) for kw in
                            ["computer", "software", "information", "it", "electronics",
                             "electrical", "data", "artificial"])
        if title_has_tech and branch_is_tech:
            return 0.6  # generic tech role + tech branch → reasonable match
        if title_has_tech or branch_is_tech:
            return 0.3  # partial match
        return 0.0

    matched_title_words = title_words & student_tokens
    return len(matched_title_words) / len(title_words)


def _compute_features(
    profile_text: str,
    job_text: str,
    student_skills: list[str],
    required_skills: list[str],
    job_title: str,
    feature_names: list[str],
) -> tuple[np.ndarray, dict[str, float], list[str], list[str]]:
    student_set = {_normalize(n) for s in student_skills if (n := _safe_skill_name(s))}
    required_set = {_normalize(n) for s in required_skills if (n := _safe_skill_name(s))}

    matched = student_set & required_set
    missing = required_set - student_set

    n_required = len(required_set) or 1

    # Feature 0 — skill_match_ratio
    # Cap denominator at 10: jobs listing 15-21 skills shouldn't punish students
    # who match all the core ones.  6/21 raw = 28%; 6/10 capped = 60% — fairer.
    _REQUIRED_CAP = 10
    n_effective = min(n_required, _REQUIRED_CAP)
    skill_match_ratio = min(len(matched) / n_effective, 1.0)

    # Feature 1 — role_keyword_match
    role_keyword_match = 1.0 if (job_title and _normalize(job_title) in _normalize(profile_text)) else 0.0

    # Feature 2 — semantic_sim (TF-IDF cosine, works fully offline)
    semantic_sim = _tfidf_similarity(profile_text, job_text)

    # Feature 3 — matched_skill_count_n (precision: matched / student_skills)
    n_student = len(student_set) or 1
    matched_skill_count_n = len(matched) / n_student

    # Feature 4 — profile_skill_density (breadth: student / required, capped at 1.0)
    profile_skill_density = min(len(student_set) / n_required, 1.0)

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

    # Normalise case up-front — "Algorithm" and "algorithm" must always match
    student_skills: list[str] = [
        _safe_skill_name(s).lower().strip()
        for s in (student_profile.get("skills") or [])
        if _safe_skill_name(s).strip()
    ]
    required_skills: list[str] = [
        s.lower().strip()
        for s in (job.get("required_skills") or [])
        if isinstance(s, str) and s.strip()
    ]
    job_title: str = (job.get("title") or job.get("job_role") or "").strip()
    description: str = (job.get("description") or "").strip()

    # Always augment required_skills with skills extracted from the job description.
    # This ensures jobs posted with only generic skills (e.g. ['Communication'])
    # still get accurate domain-skill matching from the description text.
    if description:
        try:
            from app.services.skill_extractor import extract_skills_from_text
            extracted = extract_skills_from_text(description)
            existing_lower = {s.lower() for s in required_skills}
            added = 0
            for item in extracted:
                name = (item.get("name") or "").lower().strip()
                if name and name not in existing_lower:
                    required_skills.append(name)
                    existing_lower.add(name)
                    added += 1
            if added:
                logger.info("Augmented required_skills with %d skills from description", added)
        except Exception as exc:
            logger.warning("Skill extraction from description failed: %s", exc)

    # When still no skills at all, fall back to title-keyword + semantic + CGPA scoring
    if not required_skills:
        profile_text = _build_profile_text(student_profile)
        job_text = _build_job_text(job)
        semantic_sim = _tfidf_similarity(profile_text, job_text)

        # Title keyword matching — does the student have skills related to the job title?
        branch = student_profile.get("branch") or ""
        title_kw_score = _title_keyword_score(job_title, student_skills, branch)

        # CGPA floor
        cgpa = float(student_profile.get("cgpa") or 0)
        cgpa_floor = max(0.0, (cgpa - 7.0) / 3.0 * 25.0) if cgpa >= 7.0 else 0.0

        # Combine: title match (up to 60pts) + semantic (up to 15pts) + cgpa floor
        raw_score = (title_kw_score * 60.0) + min(semantic_sim * 15.0, 10.0)
        match_score = round(float(np.clip(max(raw_score, cgpa_floor), 0.0, 100.0)), 1)

        logger.info(
            "No required_skills — fallback score: %.1f (title_kw=%.2f, semantic=%.4f, cgpa_floor=%.1f)",
            match_score, title_kw_score, semantic_sim, cgpa_floor
        )
        return {
            "match_score": match_score,
            "match_label": _match_label(match_score),
            "matched_skills": [],
            "gap_skills": [],
            "feature_values": {
                "semantic_sim": round(semantic_sim, 4),
                "title_keyword_score": round(title_kw_score, 4),
                "cgpa_floor": round(cgpa_floor, 1),
            },
        }

    profile_text = _build_profile_text(student_profile)
    job_text = _build_job_text(job)

    feature_vector, feature_values, matched_skills, gap_skills = _compute_features(
        profile_text=profile_text,
        job_text=job_text,
        student_skills=student_skills,
        required_skills=required_skills,
        job_title=job_title,
        feature_names=artifact["feature_names"],
    )

    # Apply saved MinMaxScaler so model sees the same [0,1] distribution it trained on
    scaler = artifact.get("scaler")
    feature_vector_scaled = scaler.transform(feature_vector) if scaler is not None else feature_vector

    # ── Extract feature values ────────────────────────────────────────────────
    skill_match_ratio      = feature_values["skill_match_ratio"]
    semantic_sim           = feature_values["semantic_sim"]
    role_kw                = feature_values["role_keyword_match"]
    matched_skill_count_n  = feature_values["matched_skill_count_n"]
    profile_skill_density  = feature_values["profile_skill_density"]

    branch = student_profile.get("branch") or ""
    title_kw_score = _title_keyword_score(job_title, student_skills, branch)
    cgpa = float(student_profile.get("cgpa") or 0)

    # ── Component 1: Skill overlap — primary signal (70 pts max) ─────────────
    # skill_match_ratio = matched / min(required, 10).  Multiply by 100 for pts.
    skill_component = skill_match_ratio * 70.0   # 0–70

    # ── Component 2: Model OR semantic — secondary signal (20 pts max) ───────
    ml_model = artifact.get("model") if artifact.get("model_loaded") else None
    model_score_raw: float = 0.0
    model_used = False
    if ml_model is not None:
        try:
            pred = float(ml_model.predict(feature_vector_scaled)[0])
            # Model is trained to predict 0–100; clip in case of extrapolation
            model_score_raw = float(np.clip(pred, 0.0, 100.0))
            model_used = True
            logger.info(
                "[Matcher] ML model prediction: %.2f (job=%s)", model_score_raw, job_title
            )
        except Exception as exc:
            logger.warning("[Matcher] ML model inference failed — using semantic_sim: %s", exc)
            model_score_raw = semantic_sim * 100.0
    else:
        # Fallback: use skill_match_ratio as proxy for model score.
        # The model would primarily use skills too, so ratio IS the best proxy.
        effective_semantic = max(semantic_sim, skill_match_ratio)
        model_score_raw = effective_semantic * 100.0

    model_component = model_score_raw * 0.20   # 0–20

    # ── Component 3: Bonus signals (10 pts max) ──────────────────────────────
    role_bonus  = role_kw * 3.0                    # 0 or +3
    title_bonus = title_kw_score * 4.0             # 0–4
    cgpa_bonus  = max(0.0, (cgpa - 7.0) / 3.0 * 3.0) if cgpa >= 7.0 else 0.0  # 0–3
    # precision bonus: smooth 0→5 pts scaled by skill match ratio
    precision_bonus = skill_match_ratio * 5.0
    bonus_component = min(role_bonus + title_bonus + cgpa_bonus + precision_bonus, 10.0)

    raw = skill_component + model_component + bonus_component

    # CGPA floor: academics ensure a visible minimum even with 0 matched skills
    cgpa_floor = max(0.0, (cgpa - 7.0) / 3.0 * 12.0) if cgpa >= 7.0 else 0.0

    match_score = round(float(np.clip(max(raw, cgpa_floor), 0.0, 100.0)), 1)

    logger.info(
        "[Matcher] job=%s | matched=%d/%d | ratio=%.3f | "
        "skill_cmp=%.1f | model_cmp=%.1f (used=%s, raw=%.1f) | "
        "bonus=%.1f | cgpa_floor=%.1f | FINAL=%.1f%%",
        job_title,
        len(matched_skills), len(required_skills),
        skill_match_ratio,
        skill_component, model_component, model_used, model_score_raw,
        bonus_component, cgpa_floor, match_score,
    )

    return {
        # ── Primary fields (backward-compatible) ─────────────────────────────
        "match_score": match_score,
        "match_label": _match_label(match_score),
        "matched_skills": matched_skills,
        "gap_skills": gap_skills,
        "feature_values": feature_values,
        # ── Extended debug breakdown ──────────────────────────────────────────
        "skill_match_ratio": round(skill_match_ratio, 4),
        "model_score": round(model_score_raw, 2),
        "model_used": model_used,
        "debug": {
            "skill_component": round(skill_component, 2),
            "model_component": round(model_component, 2),
            "bonus_component": round(bonus_component, 2),
            "cgpa_floor": round(cgpa_floor, 2),
            "semantic_sim": round(semantic_sim, 4),
            "title_kw_score": round(title_kw_score, 4),
            "matched_count": len(matched_skills),
            "required_count": len(required_skills),
        },
    }
