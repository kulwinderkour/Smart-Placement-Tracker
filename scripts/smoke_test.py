"""
Full Production Smoke Test
Run: python3 scripts/smoke_test.py
"""
import urllib.request, json, uuid, sys, os

BASE = os.environ.get("BASE_URL", "http://localhost:8000/api/v1")
AI   = os.environ.get("AI_URL",   "http://localhost:8002")

def req(method, url, body=None, token=None, timeout=15):
    data = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=timeout) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read())
        except Exception:
            return e.code, {}

results = []

def check(name, code, ok):
    results.append((name, code, ok))
    status = "PASS" if ok else "FAIL"
    print(f"  [{status}] {name:35s} HTTP {code}")

# ── 1. Student signup ──────────────────────────────────────────
email = f"smoke_{uuid.uuid4().hex[:8]}@test.com"
s, d = req("POST", f"{BASE}/auth/register", {"email": email, "password": "Test1234!", "role": "student"})
check("STUDENT_SIGNUP", s, s == 201)

# ── 2. Student login ──────────────────────────────────────────
s, d = req("POST", f"{BASE}/auth/login", {"email": email, "password": "Test1234!"})
check("STUDENT_LOGIN", s, s == 200)
token = d.get("access_token", "")

# ── 3. Auth /me ───────────────────────────────────────────────
s, d = req("GET", f"{BASE}/auth/me", token=token)
check("AUTH_ME", s, s == 200 and d.get("role") == "student")

# ── 4. Get profile ────────────────────────────────────────────
s, d = req("GET", f"{BASE}/student/profile", token=token)
check("GET_PROFILE", s, s == 200)

# ── 5. Update profile skills (simulates resume profile sync) ──
s, d = req("PATCH", f"{BASE}/student/profile",
           {"skills": ["python", "machine learning", "sql"]}, token=token)
check("PROFILE_SKILL_SYNC", s, s == 200)

# ── 6. Verify skills saved ────────────────────────────────────
s, d = req("GET", f"{BASE}/student/profile", token=token)
saved = [sk.get("name","") if isinstance(sk,dict) else sk for sk in d.get("skills", [])]
check("SKILLS_PERSISTED", s, "python" in saved)

# ── 7. List jobs ──────────────────────────────────────────────
s, d = req("GET", f"{BASE}/student/jobs")
check("LIST_JOBS", s, s == 200)

# ── 8. Admin signup + login ───────────────────────────────────
adm_email = f"admin_{uuid.uuid4().hex[:8]}@test.com"
req("POST", f"{BASE}/auth/register", {"email": adm_email, "password": "Admin1234!", "role": "admin"})
s, d = req("POST", f"{BASE}/auth/login", {"email": adm_email, "password": "Admin1234!"})
check("ADMIN_LOGIN", s, s == 200)
adm_token = d.get("access_token", "")

# ── 9. Admin create job ───────────────────────────────────────
s, d = req("POST", f"{BASE}/jobs",
           {"role_title": "SmokeTest SWE", "company_name": "TestCo",
            "location": "Remote", "required_skills": ["python"],
            "description": "Smoke test job", "is_active": True},
           token=adm_token)
check("ADMIN_CREATE_JOB", s, s in (200, 201))
job_id = d.get("id") or (d.get("data") or {}).get("id", "")

# ── 10. Student apply ─────────────────────────────────────────
if job_id:
    s, d = req("POST", f"{BASE}/applications", {"job_id": job_id}, token=token)
    check("STUDENT_APPLY", s, s in (200, 201))

    # ── 11. Duplicate prevention ──────────────────────────────
    s2, _ = req("POST", f"{BASE}/applications", {"job_id": job_id}, token=token)
    check("DUPLICATE_PREVENTION", s2, s2 in (400, 409, 422))
else:
    check("STUDENT_APPLY", 0, False)
    check("DUPLICATE_PREVENTION", 0, False)

# ── 12. Application history ───────────────────────────────────
s, d = req("GET", f"{BASE}/applications", token=token)
check("APPLICATION_HISTORY", s, s == 200)

# ── 13. Admin view applicants ─────────────────────────────────────────────────
s, d = req("GET", f"{BASE}/admin/applicants", token=adm_token)
check("ADMIN_VIEW_APPS", s, s == 200)

# ── 14. Memory query via agent ────────────────────────────────────────────────
s, d = req("POST", f"{AI}/api/agent/auto-apply",
           {"instruction": "what skills do I have?",
            "student_token": token,
            "student_profile": {"fullName": "Smoke Test", "branch": "CS",
                                 "college": "Test Univ", "cgpa": 8.0,
                                 "skills": ["python", "sql"]}}, timeout=30)
check("AGENT_MEMORY_QUERY", s, s == 200)

# ── 15. Agent greeting ────────────────────────────────────────────────────────
s, d = req("POST", f"{AI}/api/agent/auto-apply",
           {"instruction": "hello",
            "student_token": token,
            "student_profile": {"fullName": "Smoke Test", "branch": "CS",
                                 "college": "Test Univ", "cgpa": 8.0,
                                 "skills": ["python"]}}, timeout=20)
check("AGENT_GREETING", s, s == 200)

# ── 16. Agent job search ──────────────────────────────────────────────────────
s, d = req("POST", f"{AI}/api/agent/auto-apply",
           {"instruction": "find software engineering jobs",
            "student_token": token,
            "student_profile": {"fullName": "Smoke Test", "branch": "CS",
                                 "college": "Test Univ", "cgpa": 8.0,
                                 "skills": ["python", "machine learning"]}}, timeout=30)
check("AGENT_JOB_SEARCH", s, s == 200)

# ── Health endpoints ──────────────────────────────────────────
for path, name in [
    (f"{BASE.replace('/api/v1','')}/health",   "HEALTH_BACKEND"),
    (f"{AI}/health",                            "HEALTH_AI_ENGINE"),
    (f"{AI}/model/health",                      "HEALTH_MODEL"),
    (f"{AI}/redis/health",                      "HEALTH_REDIS"),
    (f"{AI}/db/health",                         "HEALTH_DB"),
]:
    s, d = req("GET", path)
    check(name, s, s == 200 and d.get("status") in ("ok", "degraded"))

# ── Summary ───────────────────────────────────────────────────
passed = sum(1 for _, _, ok in results if ok)
failed = sum(1 for _, _, ok in results if not ok)
print()
print(f"Results: {passed} passed, {failed} failed out of {len(results)} checks")
if failed:
    print("\nFAILED CHECKS:")
    for name, code, ok in results:
        if not ok:
            print(f"  - {name} (HTTP {code})")
    print("\nDEPLOYMENT BLOCKED — fix failures before deploying.")
    sys.exit(1)
else:
    print("\nALL SMOKE TESTS PASSED — ready to deploy.")
    sys.exit(0)
