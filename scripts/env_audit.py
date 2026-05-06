"""
Production Env Vars Audit
Run inside backend container:
  docker exec smart-placement-tracker-backend-api-1 python3 /app/scripts/env_audit.py
"""
from app.config import settings

checks = [
    ("DATABASE_URL",             bool(settings.DATABASE_URL)),
    ("REDIS_URL",                bool(settings.REDIS_URL)),
    ("UPSTASH_REDIS_REST_URL",   bool(settings.UPSTASH_REDIS_REST_URL)),
    ("UPSTASH_REDIS_REST_TOKEN", bool(settings.UPSTASH_REDIS_REST_TOKEN)),
    ("JWT_SECRET",               bool(settings.JWT_SECRET)),
    ("GOOGLE_CLIENT_ID",         bool(settings.GOOGLE_CLIENT_ID) and "YOUR_" not in settings.GOOGLE_CLIENT_ID),
    ("GOOGLE_CLIENT_SECRET",     bool(settings.GOOGLE_CLIENT_SECRET) and "YOUR_" not in settings.GOOGLE_CLIENT_SECRET),
    ("GOOGLE_REDIRECT_URI",      bool(settings.GOOGLE_REDIRECT_URI)),
    ("GCS_BUCKET_NAME",          bool(settings.GCS_BUCKET_NAME)),
    ("GCS_PROJECT_ID",           bool(settings.GCS_PROJECT_ID)),
    ("GEMINI_API_KEY",           bool(settings.GEMINI_API_KEY)),
    ("FRONTEND_URL",             bool(settings.FRONTEND_URL)),
]

print("\n=== Backend Env Audit ===")

all_ok = True
for k, v in checks:
    tag = "[OK]     " if v else "[MISSING]"
    if not v:
        all_ok = False
    print(f"  {tag} {k}")

print()
print(f"  GOOGLE_REDIRECT_URI = {settings.GOOGLE_REDIRECT_URI}")
print(f"  FRONTEND_URL        = {settings.FRONTEND_URL}")
print(f"  DATABASE_URL prefix = {settings.DATABASE_URL[:45]}")
print()
print("  Result:", "ALL OK" if all_ok else "MISSING VARS — fix before deploy")
