#!/usr/bin/env python
"""Profile-Job Matcher — Real Resume Training Script
========================================
Trains a GradientBoostingRegressor using REAL resume data instead of synthetic data.

Features (5 total):
  [0] skill_match_ratio      – matched required skills / total required skills
  [1] role_keyword_match     – 1 if job-role text found verbatim in resume, else 0
  [2] semantic_sim           – cosine similarity of TF-IDF embeddings
  [3] matched_skill_count_n  – absolute matched-skill count normalised by n_required
  [4] profile_skill_density  – profile skills found / required skills count (capped at 2)

Model saved to: app/models/profile_matcher_real.joblib
    
Usage (from ai-engine/ directory):
    python train_profile_matcher_real.py
"""
from __future__ import annotations

import csv
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
from sklearn.preprocessing import MinMaxScaler

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "app" / "models"
MODEL_PATH = MODEL_DIR / "profile_matcher_real.joblib"
TRAINING_DATA_PATH = BASE_DIR / "app" / "data" / "processed" / "training_data.csv"

RANDOM_SEED = 42
random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

ENCODER_MODEL_NAME = "tfidf"  # offline — no HuggingFace download needed

# ── job role → required skills ───────────────────────────────────────────────--
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

# ── helpers ──────────────────────────────────────────────────────────────────--

def _normalize(text: str) -> str:
    return " ".join(text.lower().replace("_", " ").split())


def _make_profile_text(resume_text: str, role_hint: str) -> str:
    """Create profile text from resume data."""
    if not resume_text:
        return f"Professional with experience in {role_hint.lower()} domain."
    
    # Clean and limit resume text to reasonable length
    cleaned_text = " ".join(resume_text.split()[:100])  # First 100 words
    return f"Resume: {cleaned_text}. Role: {role_hint}."


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
    n_prof = len(prof_set) or 1
    # F0: recall  — matched / required  (how many required skills does student have?)
    ratio = len(matched) / n_req
    # F3: precision — matched / student  (how much of student's skills are on-topic?)
    count_n = len(matched) / n_prof
    # F4: breadth  — student skills / required (capped at 1; >1 means over-qualified)
    density = min(len(prof_set) / n_req, 1.0)
    return {"skill_match_ratio": ratio, "matched_skill_count_n": count_n, "profile_skill_density": density}


def _extract_skills_from_text(text: str) -> list[str]:
    """Extract skills from resume text using keyword matching."""
    found_skills = []
    text_lower = text.lower()
    
    for skill in SKILLS_POOL:
        if skill.lower() in text_lower:
            found_skills.append(skill)
    
    return found_skills


# ── real data loading ───────────────────────────────────────────────────────--

def load_real_training_data() -> list[dict]:
    """Load real resume data from CSV file."""
    pairs = []
    
    if not TRAINING_DATA_PATH.exists():
        logger.error(f"Training data not found at {TRAINING_DATA_PATH}")
        logger.info("Please ensure you have real resume data in the CSV file")
        return pairs
    
    logger.info(f"Loading real training data from {TRAINING_DATA_PATH}")
    
    with open(TRAINING_DATA_PATH, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        for row in reader:
            resume_text = row.get('resume_text', '').strip()
            job_role = row.get('job_role', '').strip()
            
            if not resume_text or not job_role:
                continue
                
            # Get required skills for this job role
            required_skills = JOB_PROFILES.get(job_role, [])
            if not required_skills:
                continue
            
            # Extract skills from resume text
            resume_skills = _extract_skills_from_text(resume_text)
            
            # Create profile text
            profile_text = _make_profile_text(resume_text, job_role)
            job_text = _make_job_description(job_role, required_skills)
            
            # Calculate features
            overlap = _skill_overlap_features(resume_skills, required_skills)
            role_kw = 1.0 if _normalize(job_role) in _normalize(profile_text) else 0.0
            
            pairs.append({
                "profile_text": profile_text,
                "job_text": job_text,
                "profile_skills": resume_skills,
                "required_skills": required_skills,
                "job_role": job_role,
                "skill_match_ratio": overlap["skill_match_ratio"],
                "role_keyword_match": role_kw,
                "matched_skill_count_n": overlap["matched_skill_count_n"],
                "profile_skill_density": overlap["profile_skill_density"],
                "resume_text": resume_text,  # Keep original for debugging
            })
    
    logger.info(f"Loaded {len(pairs)} real resume-job pairs")
    return pairs


# ── feature computation with TF-IDF ─────────────────────────────────────────--

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
    Build realistic target scores based on actual skill overlap.
    Higher weight on actual skill matching, smaller bonuses for other factors.
    """
    rng = np.random.default_rng(RANDOM_SEED)
    labels = []
    for pair, sim in zip(pairs, sims):
        # Primary: skill match ratio (0-80 points)
        base = pair["skill_match_ratio"] * 80.0
        
        # Secondary: role keyword match (0-10 points)
        role = pair["role_keyword_match"] * 10.0
        
        # Tertiary: semantic similarity (0-10 points)
        sem = min(float(sim) * 10.0, 10.0)
        
        # Small noise for realism (±2 points)
        noise = float(rng.normal(0, 2.0))
        
        score = base + role + sem + noise
        labels.append(float(np.clip(score, 0.0, 100.0)))
    
    return np.array(labels, dtype=np.float32)


# ── training & evaluation ───────────────────────────────────────────────────--

def train_and_evaluate(
    X: np.ndarray, y: np.ndarray
) -> tuple[GradientBoostingRegressor, MinMaxScaler]:
    # ── Scale all features to [0, 1] before training ─────────────────────
    scaler = MinMaxScaler()
    X_scaled = scaler.fit_transform(X)
    logger.info("  Feature ranges after scaling (should all be [0,1]):")
    for i, (lo, hi) in enumerate(zip(scaler.data_min_, scaler.data_max_)):
        logger.info("    feature[%d]: raw [%.3f, %.3f]", i, lo, hi)

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=RANDOM_SEED
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

    cv_scores = cross_val_score(model, X_scaled, y, cv=5, scoring="r2")

    logger.info("─" * 52)
    logger.info("  Profile-Job Matcher — REAL DATA Training Report")
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

    return model, scaler


# ── main ─────────────────────────────────────────────────────────────────────--

def main() -> None:
    logger.info("Loading REAL resume training data ...")
    pairs = load_real_training_data()
    
    if not pairs:
        logger.error("No training data found. Please add real resume data to training_data.csv")
        sys.exit(1)
    
    logger.info("  Total pairs: %d", len(pairs))

    sims = compute_semantic_similarities(pairs)

    X = build_feature_matrix(pairs, sims)
    y = build_labels(pairs, sims)

    logger.info("Training GradientBoostingRegressor on REAL data ...")
    model, scaler = train_and_evaluate(X, y)

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    artifact = {
        "model": model,
        "scaler": scaler,
        "feature_names": [
            "skill_match_ratio",
            "role_keyword_match",
            "semantic_sim",
            "matched_skill_count_n",
            "profile_skill_density",
        ],
        "encoder_name": ENCODER_MODEL_NAME,
        "version": "real-1.0",
        "training_data_source": "real_resumes",
        "training_samples": len(pairs),
    }
    joblib.dump(artifact, MODEL_PATH)
    logger.info("REAL model saved → %s", MODEL_PATH)


if __name__ == "__main__":
    main()
