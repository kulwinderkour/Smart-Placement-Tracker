from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split

from app.services.resume_parser import parse_resume

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
DATASET_PATH = DATA_DIR / "ResumesPDF"
PROCESSED_DIR = DATA_DIR / "processed"
MODEL_DIR = BASE_DIR / "models"

DEFAULT_TRAINING_CSV = PROCESSED_DIR / "training_data.csv"
CLASSIFIER_PATH = MODEL_DIR / "job_classifier.pkl"
VECTORIZER_PATH = MODEL_DIR / "vectorizer.pkl"


def _load_from_csv(csv_path: Path) -> tuple[list[str], list[str]]:
    if not csv_path.exists():
        return [], []

    df = pd.read_csv(csv_path)
    required_columns = {"resume_text", "job_role"}
    if not required_columns.issubset(df.columns):
        raise ValueError("training_data.csv must contain columns: resume_text, job_role")

    rows = df.dropna(subset=["resume_text", "job_role"])
    texts = rows["resume_text"].astype(str).tolist()
    labels = rows["job_role"].astype(str).tolist()
    return texts, labels


def _load_from_role_folders(resumes_dir: Path) -> tuple[list[str], list[str]]:
    texts: list[str] = []
    labels: list[str] = []

    if not resumes_dir.exists():
        return texts, labels

    def _read_resume_content(file_path: Path) -> str:
        suffix = file_path.suffix.lower()
        if suffix in {".pdf", ".docx"}:
            return parse_resume(file_path.read_bytes(), file_path.name)
        if suffix == ".txt":
            return file_path.read_text(encoding="utf-8", errors="ignore").strip()
        return ""

    for role_dir in sorted(resumes_dir.iterdir()):
        if not role_dir.is_dir() or role_dir.name.lower() == "processed":
            continue
        role = role_dir.name.replace("_", " ").strip()
        for file_path in role_dir.rglob("*"):
            if not file_path.is_file() or file_path.suffix.lower() not in {".pdf", ".docx", ".txt"}:
                continue
            content = _read_resume_content(file_path)
            if content:
                texts.append(content)
                labels.append(role)

    return texts, labels


def load_training_samples(
    csv_path: Path = DEFAULT_TRAINING_CSV,
    resumes_dir: Path = DATASET_PATH,
) -> tuple[list[str], list[str]]:
    csv_texts, csv_labels = _load_from_csv(csv_path)
    folder_texts, folder_labels = _load_from_role_folders(resumes_dir)

    texts = csv_texts + folder_texts
    labels = csv_labels + folder_labels

    if not texts:
        raise ValueError(
            "No training samples found. Add data in app/data/processed/training_data.csv "
            "or role folders under app/data/ResumesPDF/<role_name>/ with pdf/docx/txt files"
        )

    return texts, labels


def train_job_classifier(
    csv_path: Path = DEFAULT_TRAINING_CSV,
    resumes_dir: Path = DATASET_PATH,
    classifier_path: Path = CLASSIFIER_PATH,
    vectorizer_path: Path = VECTORIZER_PATH,
) -> dict[str, Any]:
    texts, labels = load_training_samples(csv_path=csv_path, resumes_dir=resumes_dir)

    if len(set(labels)) < 2:
        raise ValueError("Need at least 2 job roles to train classifier")

    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    vectorizer = TfidfVectorizer(
        lowercase=True,
        stop_words="english",
        ngram_range=(1, 2),
        max_features=12000,
    )

    x = vectorizer.fit_transform(texts)
    y = labels

    model = LogisticRegression(max_iter=1000, class_weight="balanced")

    if len(texts) >= 10:
        x_train, x_test, y_train, y_test = train_test_split(
            x, y, test_size=0.2, random_state=42, stratify=y
        )
        model.fit(x_train, y_train)
        y_pred = model.predict(x_test)
        accuracy = float(accuracy_score(y_test, y_pred))
        report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
    else:
        model.fit(x, y)
        accuracy = None
        report = None

    joblib.dump(model, classifier_path)
    joblib.dump(vectorizer, vectorizer_path)

    return {
        "samples": len(texts),
        "roles": sorted(set(labels)),
        "accuracy": accuracy,
        "classification_report": report,
        "model_path": str(classifier_path),
        "vectorizer_path": str(vectorizer_path),
    }
