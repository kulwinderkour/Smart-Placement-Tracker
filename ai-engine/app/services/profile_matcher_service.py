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

    title_words = set(_normalize(job_title).split()) - _TITLE_STOP_WORDS
    if not title_words:
        return 0.0

    # Build token set from student skills + branch (split multi-word entries)
    student_tokens: set[str] = set()
    for s in student_skills:
        name = _safe_skill_name(s)
        if name:
            student_tokens.update(_normalize(name).split())
    if branch:
        student_tokens.update(_normalize(branch).split())

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

    # When still no skills at all, fall back to pure semantic-similarity scoring
    if not required_skills:
        profile_text = _build_profile_text(student_profile)
        job_text = _build_job_text(job)
        semantic_sim = _tfidf_similarity(profile_text, job_text)
        match_score = round(float(np.clip(semantic_sim * 100, 0.0, 100.0)), 1)
        logger.info("No skills available — semantic-only score: %.1f", match_score)
        return {
            "match_score": match_score,
            "match_label": _match_label(match_score),
            "matched_skills": [],
            "gap_skills": [],
            "feature_values": {"semantic_sim": round(semantic_sim, 4)},
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

    # ── Transparent formula-based scoring ───────────────────────────────────
    # Primary signal: skill match ratio (4/5 = 80%, 5/5 = 100%, 0/5 = 0%)
    skill_match_ratio = feature_values["skill_match_ratio"]
    semantic_sim      = feature_values["semantic_sim"]
    role_kw           = feature_values["role_keyword_match"]
    matched_skill_count_n  = feature_values["matched_skill_count_n"]
    profile_skill_density  = feature_values["profile_skill_density"]

    branch = student_profile.get("branch") or ""
    title_kw_score = _title_keyword_score(job_title, student_skills, branch)

    skill_score      = skill_match_ratio * 100.0          # 0–100
    semantic_bonus   = min(semantic_sim * 15.0, 10.0)     # up to +10 pts
    role_bonus       = role_kw * 5.0                      # 0 or +5 pts
    title_bonus      = title_kw_score * 8.0               # up to +8 pts from title keywords
    raw              = skill_score + semantic_bonus + role_bonus + title_bonus

    # CGPA-based floor: strong academics always get a minimum even with 0 skills
    # CGPA 7→0%, 8→8%, 9→17%, 10→25%
    cgpa      = float(student_profile.get("cgpa") or 0)
    cgpa_floor = max(0.0, (cgpa - 7.0) / 3.0 * 25.0) if cgpa >= 7.0 else 0.0

    match_score = round(float(np.clip(max(raw, cgpa_floor), 0.0, 100.0)), 1)

    print(
        f"\n── SCORE DEBUG ─────────────────────────────\n"
        f"  job              : {job_title}\n"
        f"  branch           : {branch}\n"
        f"  student_skills   : {student_skills}\n"
        f"  required_skills  : {required_skills}\n"
        f"  matched          : {matched_skills}\n"
        f"  skill_match_ratio: {skill_match_ratio:.4f}  (× 100 = {skill_score:.1f} pts)\n"
        f"  matched_count_n  : {matched_skill_count_n:.4f}\n"
        f"  role_kw_match    : {role_kw:.4f}  (+{role_bonus:.1f} pts)\n"
        f"  semantic_sim     : {semantic_sim:.4f}  (+{min(semantic_sim*15,10):.1f} pts)\n"
        f"  title_kw_score   : {title_kw_score:.4f}  (+{title_bonus:.1f} pts)\n"
        f"  profile_density  : {profile_skill_density:.4f}\n"
        f"  skill_score      : {skill_score:.2f}\n"
        f"  semantic_bonus   : {min(semantic_sim*15.0,10.0):.2f}\n"
        f"  role_bonus       : {role_bonus:.2f}\n"
        f"  title_bonus      : {title_bonus:.2f}\n"
        f"  raw_formula      : {raw:.2f}\n"
        f"  cgpa             : {cgpa:.1f} → floor {cgpa_floor:.1f}\n"
        f"  FINAL SCORE      : {match_score:.1f}%\n"
        f"────────────────────────────────────────────",
        flush=True
    )

    return {
        "match_score": match_score,
        "match_label": _match_label(match_score),
        "matched_skills": matched_skills,
        "gap_skills": gap_skills,
        "feature_values": feature_values,
    }
