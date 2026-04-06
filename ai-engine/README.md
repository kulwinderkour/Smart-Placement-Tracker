# AI Engine — Resume Match Pipeline

This service now supports a **2-model architecture** for placement suitability:

1. **Classifier model**: TF-IDF + Logistic Regression
   - Predicts resume job category (e.g., Data Scientist)
2. **Explanation model**: local `google/flan-t5-base`
   - Generates a short reasoning paragraph for suitability

## Architecture

- `app/services/training_service.py`
  - Loads training samples
  - Trains classifier + vectorizer
  - Saves artifacts to `app/models/job_classifier.pkl` and `app/models/vectorizer.pkl`

- `app/services/matcher_service.py`
  - Loads saved artifacts
  - Predicts role + confidence
  - Compares predicted role and skill overlap vs job requirements

- `app/services/explanation_service.py`
  - Generates explanation with Flan-T5
  - Falls back to template text if model load/inference fails

- `app/services/agent_service.py`
  - End-to-end pipeline:
    resume text/path -> role prediction -> matching -> explanation

## Data layout

- `app/data/resumes/`
  - Folder-based training samples: `app/data/resumes/<role_name>/*.txt`
- `app/data/processed/training_data.csv`
  - Optional CSV training dataset (columns: `resume_text`, `job_role`)
- `app/models/`
  - Saved classifier artifacts

## API endpoints

### Train classifier

`POST /agent/classifier/train`

No payload required. Trains on available local dataset.

### Match resume to job

`POST /agent/match-resume`

Payload:

```json
{
  "job_role": "Data Scientist",
  "required_skills": ["Python", "Machine Learning", "SQL"],
  "resume_text": "Skills: Python, Machine Learning, SQL..."
}
```

or provide `resume_path` instead of `resume_text`:

```json
{
  "job_role": "Data Scientist",
  "required_skills": ["Python", "Machine Learning", "SQL"],
  "resume_path": "C:/resumes/candidate_resume.pdf"
}
```

Response shape:

```json
{
  "success": true,
  "data": {
    "match": true,
    "predicted_role": "Data Scientist",
    "confidence": 0.82,
    "role_match": true,
    "skill_match_ratio": 1.0,
    "matched_skills": ["python", "machine learning", "sql"],
    "missing_skills": [],
    "resume_skills": ["Python", "Machine Learning", "SQL"],
    "top_predictions": [
      {"role": "Data Scientist", "score": 0.82}
    ],
    "explanation": "The candidate is suitable ..."
  }
}
```

## Quick start

1. Install deps (inside `ai-engine`):
   - `pip install -r requirements.txt`
2. Add training data in either:
   - `app/data/processed/training_data.csv`
   - and/or `app/data/resumes/<role_name>/*.txt`
3. Train model:
   - `POST /agent/classifier/train`
4. Run matching:
   - `POST /agent/match-resume`

## Notes

- First explanation generation can be slow because `flan-t5-base` loads at first request.
- If model download is unavailable/offline and cache is missing, explanation falls back to deterministic template text.
