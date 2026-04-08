#!/usr/bin/env python
"""Profile-Job Matcher — Training Script
========================================
Trains a GradientBoostingRegressor that predicts how well a candidate
profile matches a job's requirements (0–100 % match score).

Features (5 total):
  [0] skill_match_ratio      – matched required skills / total required skills
  [1] role_keyword_match     – 1 if job-role text found verbatim in profile, else 0
  [2] semantic_sim           – cosine similarity of sentence-transformer embeddings
  [3] matched_skill_count_n  – absolute matched-skill count normalised by n_required
  [4] profile_skill_density  – profile skills found / required skills count (capped at 2)

Model saved to: app/models/profile_matcher.joblib
    
Usage (from ai-engine/ directory):
    python train_profile_matcher.py
"""
from __future__ import annotations

import logging
import random
import sys
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity as sk_cosine_sim
from sklearn.model_selection import cross_val_score, train_test_split

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "app" / "models"
MODEL_PATH = MODEL_DIR / "profile_matcher.joblib"

RANDOM_SEED = 42
random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

ENCODER_MODEL_NAME = "tfidf"  # offline — no HuggingFace download needed

# ── job role → required skills ───────────────────────────────────────────────
JOB_PROFILES: dict[str, list[str]] = {
    "Data Scientist": [
        "Python", "Pandas", "NumPy", "scikit-learn",
        "Machine Learning", "Deep Learning", "SQL", "TensorFlow",
    ],
    "Backend Developer": [
        "Python", "FastAPI", "Django", "PostgreSQL",
        "Docker", "Redis", "REST API", "Git",
    ],
    "Frontend Developer": [
        "React", "TypeScript", "JavaScript", "HTML",
        "CSS", "Node.js", "Next.js", "Tailwind",
    ],
    "DevOps Engineer": [
        "Docker", "Kubernetes", "AWS", "Terraform",
        "Linux", "CI/CD", "Jenkins", "Ansible",
    ],
    "ML Engineer": [
        "Python", "TensorFlow", "PyTorch", "scikit-learn",
        "Docker", "AWS", "Pandas", "NumPy",
    ],
    "Java Developer": [
        "Java", "Spring Boot", "PostgreSQL", "REST API",
        "Docker", "Git", "Microservices", "Kubernetes",
    ],
    "Cloud Engineer": [
        "AWS", "Azure", "GCP", "Terraform",
        "Kubernetes", "Docker", "Linux", "CI/CD",
    ],
    "Full Stack Developer": [
        "React", "Node.js", "Python", "PostgreSQL",
        "Docker", "REST API", "Git", "TypeScript",
    ],
    "Data Engineer": [
        "Python", "SQL", "AWS", "Docker",
        "PostgreSQL", "Pandas", "Airflow", "Spark",
    ],
    "Security Engineer": [
        "Linux", "Python", "AWS", "Docker",
        "Git", "Bash", "Kubernetes", "CI/CD",
    ],
}

SKILLS_POOL: list[str] = [
    "Python", "Java", "JavaScript", "TypeScript", "C++", "Go", "Ruby", "PHP",
    "Swift", "Kotlin", "Scala", "React", "Angular", "Vue", "Next.js", "Svelte",
    "Node.js", "Express", "FastAPI", "Django", "Flask", "Spring Boot", "Laravel",
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "Cassandra",
    "DynamoDB", "Docker", "Kubernetes", "AWS", "Azure", "GCP", "Terraform",
    "Jenkins", "GitHub Actions", "Ansible", "Machine Learning", "Deep Learning",
    "NLP", "Computer Vision", "TensorFlow", "PyTorch", "scikit-learn", "Keras",
    "Pandas", "NumPy", "Git", "Linux", "Bash", "REST API", "GraphQL", "HTML",
    "CSS", "Tailwind", "Bootstrap", "Agile", "Scrum", "CI/CD", "Microservices",
    "System Design", "OOP", "Data Structures", "Algorithms", "DevOps",
    "Cloud Computing", "Airflow", "Spark", "SQL", "Postman", "Figma",
]


# ── helpers ──────────────────────────────────────────────────────────────────

def _normalize(text: str) -> str:
    return " ".join(text.lower().replace("_", " ").split())


def _make_profile_text(role_hint: str, skills: list[str]) -> str:
    if not skills:
        return (
            f"Software professional with experience in {role_hint.lower()} domain. "
            "Worked on team projects and production systems."
        )
    parts = [
        f"Experienced {role_hint} with strong expertise in {', '.join(skills[:3])}.",
        f"Skilled in {', '.join(skills[3:6]) if len(skills) > 3 else skills[0]} and modern tooling.",
        f"Delivered production projects using {', '.join(skills)}.",
        "Comfortable with version control, agile workflows, and cross-functional collaboration.",
    ]
    return " ".join(parts)


def _make_job_description(role: str, required_skills: list[str]) -> str:
    return (
        f"Position: {role}. "
        f"Required skills: {', '.join(required_skills)}. "
        f"Seeking a {role.lower()} experienced in building and maintaining production systems."
    )


def _skill_overlap_features(
    profile_skills: list[str], required_skills: list[str]
) -> dict[str, float]:
    prof_set = {_normalize(s) for s in profile_skills}
    req_set = {_normalize(s) for s in required_skills}
    matched = prof_set & req_set
    n_req = len(req_set) or 1
    ratio = len(matched) / n_req
    count_n = len(matched) / n_req
    density = min(len(prof_set) / n_req, 2.0)
    return {"skill_match_ratio": ratio, "matched_skill_count_n": count_n, "profile_skill_density": density}


# ── synthetic data generation ────────────────────────────────────────────────

def generate_synthetic_pairs(n_per_level: int = 20) -> list[dict]:
    """
    Generates (profile_text, job_text, skills, true_match_pct) pairs with
    controlled skill-overlap levels: 0%, 25%, 50%, 75%, 100%.
    """
    pairs: list[dict] = []
    roles = list(JOB_PROFILES.keys())

    for role, required_skills in JOB_PROFILES.items():
        n_req = len(required_skills)

        for overlap_frac in [0.0, 0.25, 0.50, 0.75, 1.0]:
            for _ in range(n_per_level):
                n_matching = round(overlap_frac * n_req)
                matching_skills = random.sample(required_skills, n_matching)

                irrelevant_pool = [
                    s for s in SKILLS_POOL
                    if _normalize(s) not in {_normalize(r) for r in required_skills}
                ]
                n_extra = random.randint(0, 4)
                extra_skills = random.sample(irrelevant_pool, min(n_extra, len(irrelevant_pool)))

                profile_skills = matching_skills + extra_skills
                random.shuffle(profile_skills)

                role_in_profile = random.random() < 0.5
                profile_role_hint = role if role_in_profile else random.choice(
                    [r for r in roles if r != role]
                )

                profile_text = _make_profile_text(profile_role_hint, profile_skills)
                job_text = _make_job_description(role, required_skills)

                ol = _skill_overlap_features(profile_skills, required_skills)
                role_kw = 1.0 if _normalize(role) in _normalize(profile_text) else 0.0

                pairs.append({
                    "profile_text": profile_text,
                    "job_text": job_text,
                    "profile_skills": profile_skills,
                    "required_skills": required_skills,
                    "job_role": role,
                    "skill_match_ratio": ol["skill_match_ratio"],
                    "role_keyword_match": role_kw,
                    "matched_skill_count_n": ol["matched_skill_count_n"],
                    "profile_skill_density": ol["profile_skill_density"],
                })

    return pairs


# ── feature computation with sentence-transformers ───────────────────────────

def compute_semantic_similarities(pairs: list[dict]) -> list[float]:
    """Compute TF-IDF cosine similarity offline — no model download needed."""
    logger.info("Computing TF-IDF cosine similarities for %d pairs ...", len(pairs))
    profile_texts = [p["profile_text"] for p in pairs]
    job_texts = [p["job_text"] for p in pairs]

    all_texts = profile_texts + job_texts
    vec = TfidfVectorizer(ngram_range=(1, 2), stop_words="english", min_df=1)
    mat = vec.fit_transform(all_texts)

    n = len(pairs)
    sims = [
        float(np.clip(sk_cosine_sim(mat[i : i + 1], mat[n + i : n + i + 1])[0][0], 0.0, 1.0))
        for i in range(n)
    ]
    logger.info("  Similarity range: min=%.3f  max=%.3f", min(sims), max(sims))
    return sims


def build_feature_matrix(pairs: list[dict], sims: list[float]) -> np.ndarray:
    rows = []
    for pair, sim in zip(pairs, sims):
        rows.append([
            pair["skill_match_ratio"],
            pair["role_keyword_match"],
            float(sim),
            pair["matched_skill_count_n"],
            pair["profile_skill_density"],
        ])
    return np.array(rows, dtype=np.float32)


def build_labels(pairs: list[dict], sims: list[float]) -> np.ndarray:
    """
    Ground truth match % = weighted combination of skill overlap, role match, and semantic sim.
    A 3-point Gaussian noise models real-world variability.
    """
    labels = []
    for pair, sim in zip(pairs, sims):
        score = (
            80.0 * pair["skill_match_ratio"]
            + 10.0 * pair["role_keyword_match"]
            + 10.0 * float(sim)
            + np.random.normal(0, 3)
        )
        labels.append(float(np.clip(score, 0.0, 100.0)))
    return np.array(labels, dtype=np.float32)


# ── training & evaluation ────────────────────────────────────────────────────

def train_and_evaluate(X: np.ndarray, y: np.ndarray) -> GradientBoostingRegressor:
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_SEED
    )

    model = GradientBoostingRegressor(
        n_estimators=300,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        min_samples_leaf=5,
        random_state=RANDOM_SEED,
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    y_pred = np.clip(y_pred, 0, 100)

    r2 = r2_score(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)
    within_10 = float(np.mean(np.abs(y_pred - y_test) <= 10.0) * 100)

    cv_scores = cross_val_score(model, X, y, cv=5, scoring="r2")

    logger.info("─" * 52)
    logger.info("  Profile-Job Matcher — Training Report")
    logger.info("─" * 52)
    logger.info("  Training samples : %d", len(X_train))
    logger.info("  Test samples     : %d", len(X_test))
    logger.info("")
    logger.info("  Test  R²         : %.4f", r2)
    logger.info("  Test  MAE        : %.2f %%", mae)
    logger.info("  Within ±10 %%    : %.1f %% of predictions", within_10)
    logger.info("")
    logger.info("  CV R² (5-fold)   : %.4f ± %.4f", cv_scores.mean(), cv_scores.std())
    logger.info("")

    feature_names = [
        "skill_match_ratio",
        "role_keyword_match",
        "semantic_sim",
        "matched_skill_count_n",
        "profile_skill_density",
    ]
    importances = model.feature_importances_
    logger.info("  Feature importances:")
    for name, imp in sorted(zip(feature_names, importances), key=lambda x: -x[1]):
        bar = "█" * int(imp * 40)
        logger.info("    %-24s %.4f  %s", name, imp, bar)
    logger.info("─" * 52)

    return model


# ── main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    logger.info("Generating synthetic training pairs ...")
    pairs = generate_synthetic_pairs(n_per_level=20)
    logger.info("  Total pairs: %d", len(pairs))

    sims = compute_semantic_similarities(pairs)

    X = build_feature_matrix(pairs, sims)
    y = build_labels(pairs, sims)

    logger.info("Training GradientBoostingRegressor ...")
    model = train_and_evaluate(X, y)

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    artifact = {
        "model": model,
        "feature_names": [
            "skill_match_ratio",
            "role_keyword_match",
            "semantic_sim",
            "matched_skill_count_n",
            "profile_skill_density",
        ],
        "encoder_name": ENCODER_MODEL_NAME,
        "version": "2.0",
    }
    joblib.dump(artifact, MODEL_PATH)
    logger.info("Model saved → %s", MODEL_PATH)


if __name__ == "__main__":
    main()
