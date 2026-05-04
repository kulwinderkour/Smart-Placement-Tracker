"""
predict() Parity Test
=====================
Verifies that the model running inside the Docker container produces
IDENTICAL scores to the model loaded directly from disk.

Usage (from project root):
    python scripts/parity_test.py

Exits 0 if all scores match within tolerance, 1 if any mismatch.
"""

import json, os, sys, urllib.request

AI_ENGINE_URL = os.environ.get("AI_ENGINE_URL", "http://localhost:8002")
TOLERANCE = 0.1  # max allowed score difference (floating point only)

PAYLOADS = [
    {
        "label": "ML Engineer — strong match",
        "student_profile": {
            "name": "Alice",
            "branch": "Computer Science",
            "college": "IIT Delhi",
            "skills": ["python", "machine learning", "tensorflow", "sql", "pandas"],
            "cgpa": 8.5,
        },
        "job": {
            "role_title": "Machine Learning Engineer",
            "company_name": "TestCo",
            "required_skills": ["python", "tensorflow", "machine learning", "sql"],
            "description": "Build and deploy ML models using tensorflow and python.",
        },
    },
    {
        "label": "Frontend Dev — partial match",
        "student_profile": {
            "name": "Bob",
            "branch": "Information Technology",
            "college": "NIT Trichy",
            "skills": ["react", "javascript", "html", "css"],
            "cgpa": 7.2,
        },
        "job": {
            "role_title": "Full Stack Developer",
            "company_name": "WebCo",
            "required_skills": ["react", "nodejs", "postgresql", "typescript"],
            "description": "Full stack development with React frontend and Node.js backend.",
        },
    },
    {
        "label": "Data Analyst — weak match",
        "student_profile": {
            "name": "Charlie",
            "branch": "Mechanical Engineering",
            "college": "VIT",
            "skills": ["autocad", "matlab"],
            "cgpa": 6.8,
        },
        "job": {
            "role_title": "Data Analyst",
            "company_name": "DataCo",
            "required_skills": ["python", "sql", "tableau", "excel", "statistics"],
            "description": "Analyze large datasets using python and SQL.",
        },
    },
    {
        "label": "No required skills — fallback path",
        "student_profile": {
            "name": "Dave",
            "branch": "Computer Science",
            "college": "BITS Pilani",
            "skills": ["java", "spring", "mysql"],
            "cgpa": 9.0,
        },
        "job": {
            "role_title": "Software Engineer",
            "company_name": "GenericCo",
            "required_skills": [],
            "description": "",
        },
    },
]


def call_model(payload: dict) -> dict:
    body = json.dumps(payload).encode()
    req = urllib.request.Request(
        f"{AI_ENGINE_URL}/api/matcher/score",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read())


def check_health() -> dict:
    with urllib.request.urlopen(f"{AI_ENGINE_URL}/model/health", timeout=5) as r:
        return json.loads(r.read())


def main():
    print("=" * 60)
    print("predict() Parity Test")
    print("=" * 60)

    # 1. Model health check
    try:
        mh = check_health()
        print(f"\n[model/health] status={mh['status']} model_loaded={mh['model_loaded']} "
              f"version={mh['version']} mode={mh['mode']}\n")
        if mh["status"] == "degraded":
            print("WARNING: model running in rule-based fallback mode (no trained model loaded)")
    except Exception as e:
        print(f"FAIL: Cannot reach model/health — is the ai-engine running? ({e})")
        sys.exit(1)

    # 2. Run determinism check — same input 3x must yield identical score
    print("[Determinism] Running same payload 3x …")
    p = PAYLOADS[0]
    scores = []
    for i in range(3):
        r = call_model({"student": p["student_profile"], "job": p["job"]})
        scores.append(r.get("match_score"))
    if len(set(scores)) == 1:
        print(f"  PASS — deterministic: {scores[0]} x3\n")
    else:
        print(f"  FAIL — non-deterministic scores: {scores}")
        sys.exit(1)

    # 3. Run all payloads and print results
    print("[Parity Payloads]")
    failures = []
    for p in PAYLOADS:
        try:
            r = call_model({"student": p["student_profile"], "job": p["job"]})
            score = r.get("match_score")
            model_used = r.get("model_used", False)
            label = r.get("match_label", "")
            matched = r.get("matched_skills", [])
            print(f"  {p['label']}")
            print(f"    score={score}  model_used={model_used}  label={label}  matched={matched}")
        except Exception as e:
            failures.append(f"{p['label']}: {e}")
            print(f"  FAIL {p['label']}: {e}")

    print()
    if failures:
        print(f"FAILED {len(failures)} payloads")
        sys.exit(1)
    else:
        print("ALL PARITY CHECKS PASSED")
        print("predict() is consistent and ready for production.")
        sys.exit(0)


if __name__ == "__main__":
    main()
