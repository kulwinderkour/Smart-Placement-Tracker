"""
Production health check + parity + smoke test — all in one.
Run: python3 scripts/prod_health_check.py
"""
import urllib.request, json, uuid, sys, os, time

PROD_BACKEND = os.environ.get("PROD_BACKEND", "https://backend-api-385144446825.asia-south1.run.app")
PROD_AI      = os.environ.get("PROD_AI",      "https://ai-engine-385144446825.asia-south1.run.app")
BASE = PROD_BACKEND + "/api/v1"
AI   = PROD_AI

results = []

def get(url, timeout=30):
    try:
        with urllib.request.urlopen(url, timeout=timeout) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read())
        except: return e.code, {}
    except Exception as e:
        return 0, {"error": str(e)}

def post(url, body=None, token=None, timeout=30):
    data = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json"}
    if token: headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read())
        except: return e.code, {}
    except Exception as e:
        return 0, {"error": str(e)}

def check(name, code, ok, detail=""):
    results.append((name, code, ok))
    tag = "PASS" if ok else "FAIL"
    print(f"  [{tag}] {name:35s} HTTP {code}  {detail}")

# ── HEALTH CHECKS ──────────────────────────────────────────────────────────────
print("\n=== HEALTH CHECKS ===")
s, d = get(f"{PROD_BACKEND}/health")
check("BACKEND /health",    s, s==200 and d.get("status")=="ok", d.get("status",""))

s, d = get(f"{PROD_AI}/health")
check("AI /health",         s, s==200 and d.get("status")=="ok", d.get("status",""))

s, d = get(f"{PROD_AI}/model/health")
check("AI /model/health",   s, s==200 and d.get("model_loaded")==True,
      f"model_loaded={d.get('model_loaded')} version={d.get('version')} mode={d.get('mode')}")

s, d = get(f"{PROD_AI}/redis/health")
check("AI /redis/health",   s, s==200 and d.get("status") in ("ok","degraded"),
      f"redis={d.get('redis')} roundtrip={d.get('roundtrip')}")

s, d = get(f"{PROD_AI}/db/health")
check("AI /db/health",      s, s==200 and d.get("backend_reachable")==True,
      f"backend_reachable={d.get('backend_reachable')}")

# ── PARITY CHECK ───────────────────────────────────────────────────────────────
print("\n=== PARITY CHECK ===")
SAMPLE_STUDENT = {"name":"Alice","branch":"Computer Science","college":"IIT Delhi",
                  "skills":["python","machine learning","tensorflow","sql"],"cgpa":8.5}
SAMPLE_JOB     = {"role_title":"ML Engineer","company_name":"Co",
                  "required_skills":["python","tensorflow","machine learning","sql"],
                  "description":"Build ML models"}
scores = []
for i in range(3):
    sc, d = post(f"{PROD_AI}/api/matcher/score", {"student": SAMPLE_STUDENT, "job": SAMPLE_JOB})
    scores.append(d.get("match_score"))
parity_ok = len(set(scores)) == 1 and scores[0] is not None
check("PREDICT determinism (3x)", 200 if parity_ok else 0, parity_ok,
      f"scores={scores} model_used={d.get('model_used')}")
# Local reference score from last run
LOCAL_SCORE = 75.9
prod_score = scores[0] if scores[0] else 0
parity_match = abs(prod_score - LOCAL_SCORE) < 0.5
check("PARITY local==production", 200 if parity_match else 0, parity_match,
      f"local={LOCAL_SCORE} prod={prod_score} diff={abs(prod_score-LOCAL_SCORE):.2f}")

# ── SMOKE TEST ─────────────────────────────────────────────────────────────────
print("\n=== SMOKE TEST ===")

# Student signup + login
email = f"prodsmoke_{uuid.uuid4().hex[:8]}@test.com"
s, d = post(f"{BASE}/auth/register", {"email":email,"password":"Test1234!","role":"student"})
check("STUDENT_SIGNUP",    s, s==201)

s, d = post(f"{BASE}/auth/login", {"email":email,"password":"Test1234!"})
check("STUDENT_LOGIN",     s, s==200)
token = d.get("access_token","")

s, d = get(f"{BASE}/auth/me", )
# re-do with token
req = urllib.request.Request(f"{BASE}/auth/me",
      headers={"Authorization":f"Bearer {token}"}, method="GET")
try:
    with urllib.request.urlopen(req, timeout=15) as r: s, d = r.status, json.loads(r.read())
except urllib.error.HTTPError as e: s, d = e.code, {}
check("AUTH_ME",           s, s==200 and d.get("role")=="student")

# Profile
s, d = post(f"{BASE}/student/profile", {"skills":["python","sql"]}, token=token)
# PATCH
req2 = urllib.request.Request(f"{BASE}/student/profile",
       data=json.dumps({"skills":["python","machine learning","sql"]}).encode(),
       headers={"Content-Type":"application/json","Authorization":f"Bearer {token}"},
       method="PATCH")
try:
    with urllib.request.urlopen(req2, timeout=15) as r: s, d = r.status, json.loads(r.read())
except urllib.error.HTTPError as e: s, d = e.code, {}
check("PROFILE_SKILL_SYNC",s, s==200)

# Jobs
s, d = get(f"{BASE}/student/jobs")
check("LIST_JOBS",         s, s==200 and isinstance(d.get("data"), list))

# Admin login + create job
adm_email = f"prodadmin_{uuid.uuid4().hex[:8]}@test.com"
post(f"{BASE}/auth/register", {"email":adm_email,"password":"Admin1234!","role":"admin"})
s, d = post(f"{BASE}/auth/login", {"email":adm_email,"password":"Admin1234!"})
check("ADMIN_LOGIN",       s, s==200)
adm_token = d.get("access_token","")

s, d = post(f"{BASE}/jobs",
    {"role_title":"ProdSmoke SWE","company_name":"TestCo","location":"Remote",
     "required_skills":["python"],"description":"Prod smoke test job","is_active":True},
    token=adm_token)
check("ADMIN_CREATE_JOB",  s, s in (200,201))
job_id = d.get("id") or (d.get("data") or {}).get("id","")

# Apply + duplicate
if job_id:
    s, d  = post(f"{BASE}/applications", {"job_id":job_id}, token=token)
    check("STUDENT_APPLY",       s, s in (200,201))
    s2, _ = post(f"{BASE}/applications", {"job_id":job_id}, token=token)
    check("DUPLICATE_PREVENTION",s2, s2 in (400,409,422))
else:
    check("STUDENT_APPLY",        0, False, "no job_id")
    check("DUPLICATE_PREVENTION", 0, False, "no job_id")

# App history
req3 = urllib.request.Request(f"{BASE}/applications",
       headers={"Authorization":f"Bearer {token}"}, method="GET")
try:
    with urllib.request.urlopen(req3, timeout=15) as r: s, d = r.status, json.loads(r.read())
except urllib.error.HTTPError as e: s, d = e.code, {}
check("APPLICATION_HISTORY", s, s==200)

# Admin view apps
req4 = urllib.request.Request(f"{BASE}/admin/applicants",
       headers={"Authorization":f"Bearer {adm_token}"}, method="GET")
try:
    with urllib.request.urlopen(req4, timeout=15) as r: s, d = r.status, json.loads(r.read())
except urllib.error.HTTPError as e: s, d = e.code, {}
check("ADMIN_VIEW_APPS",   s, s==200)

# Agent greeting
s, d = post(f"{AI}/api/agent/auto-apply",
    {"instruction":"hello",
     "student_token": token,
     "student_profile":{"fullName":"Test","branch":"CS","college":"Test","cgpa":8.0,
                        "skills":["python"]}}, timeout=30)
check("AGENT_GREETING",    s, s==200)

# Agent job search
s, d = post(f"{AI}/api/agent/auto-apply",
    {"instruction":"find python developer jobs",
     "student_token": token,
     "student_profile":{"fullName":"Test","branch":"CS","college":"Test","cgpa":8.0,
                        "skills":["python","sql"]}}, timeout=40)
check("AGENT_JOB_SEARCH",  s, s==200)

# Agent memory query
s, d = post(f"{AI}/api/agent/auto-apply",
    {"instruction":"what skills do I have?",
     "student_token": token,
     "student_profile":{"fullName":"Test","branch":"CS","college":"Test","cgpa":8.0,
                        "skills":["python","machine learning","sql"]}}, timeout=30)
check("AGENT_MEMORY_QUERY",s, s==200)

# ── SUMMARY ────────────────────────────────────────────────────────────────────
passed = sum(1 for _,_,ok in results if ok)
failed = sum(1 for _,_,ok in results if not ok)
print(f"\n{'='*60}")
print(f"Results: {passed} passed, {failed} failed out of {len(results)}")
if failed:
    print("\nFAILED:")
    for name, code, ok in results:
        if not ok: print(f"  - {name} (HTTP {code})")
    print("\nACTION: Check failures above before completing deployment.")
    sys.exit(1)
else:
    print("ALL PRODUCTION CHECKS PASSED")
    sys.exit(0)
