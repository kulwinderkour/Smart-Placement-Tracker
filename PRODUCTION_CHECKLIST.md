# Production Readiness Checklist
## Smart Placement Tracker

Use this checklist before sharing with your friend or deploying to production.

---

## ✅ CRITICAL (Must Complete Before Sharing)

### 1. Purge Secrets from Git History
- [ ] Backup your current `.env` file somewhere safe (outside the repo)
- [ ] Install git-filter-repo: `pip install git-filter-repo`
- [ ] Run filter to remove secrets:
  ```bash
  git filter-repo --path .env --path .env.cloud --path .env.local --invert-paths --force
  ```
- [ ] Force push to remote (coordinate with team):
  ```bash
  git push origin main --force-with-lease
  ```
- [ ] Have all team members re-clone the repository

### 2. Rotate ALL API Keys & Secrets
- [ ] **Gemini API Key** - Generate new at https://ai.google.dev/
- [ ] **Google OAuth Credentials** - New client ID/secret in GCP Console
- [ ] **Upstash Redis Token** - Regenerate in Upstash dashboard
- [ ] **RapidAPI Key** - Regenerate in RapidAPI dashboard
- [ ] **JWT_SECRET** - Generate new: `python3 -c "import secrets; print(secrets.token_urlsafe(48))"`
- [ ] **Database Password** - Change in Cloud SQL console
- [ ] **GCS Service Account Keys** - Delete old, create new in GCP IAM

### 3. Create New .env Files
- [ ] `cp .env.example .env`
- [ ] Fill with NEW rotated secrets
- [ ] Verify no old values remain
- [ ] Add `.env` to `.gitignore` (already done)

---

## 🔧 DOCKER & INFRASTRUCTURE

### 4. Verify Docker Configuration
- [ ] `docker-compose.yml` uses relative paths only (✅ Fixed)
- [ ] All services have healthchecks (✅ Fixed)
- [ ] Redis has persistence volume (✅ Fixed)
- [ ] Service dependencies are correct (✅ Fixed)

### 5. Test Fresh Clone Workflow
```bash
# Test in a clean directory
cd /tmp
git clone <your-repo-url>
cd Smart-Placement-Tracker
cp .env.example .env
# Edit .env with test values
docker compose up --build -d
docker compose exec backend-api alembic upgrade head
docker compose ps
# Verify all services healthy
```

---

## 📦 ENVIRONMENT VARIABLES

### 6. Verify .env.example Completeness
- [ ] DATABASE_URL with all options documented
- [ ] JWT_SECRET generation instructions
- [ ] GEMINI_API_KEY marked as required
- [ ] GCS_BUCKET_NAME and GCS_PROJECT_ID
- [ ] GOOGLE_APPLICATION_CREDENTIALS path
- [ ] All frontend VITE_* variables
- [ ] REDIS_URL with local and cloud options
- [ ] FRONTEND_URLS for CORS

---

## 🔐 SECURITY

### 7. Secrets Management
- [ ] `secrets/` directory in `.gitignore` (✅ Fixed)
- [ ] `secrets/README.md` explains key requirements (✅ Created)
- [ ] Service account keys never committed
- [ ] No hardcoded secrets in source code
- [ ] API keys use environment variables only

### 8. Google Cloud Security
- [ ] GCS bucket is private (no public access)
- [ ] Service account has minimum required permissions
- [ ] Signed URLs used for resume access
- [ ] GOOGLE_APPLICATION_CREDENTIALS works in Docker

---

## 🧪 TESTING

### 9. Local Development Test
- [ ] `docker compose up` starts all services
- [ ] `alembic upgrade head` runs successfully
- [ ] Frontend loads at http://localhost:3000
- [ ] Backend API docs at http://localhost:8000/docs
- [ ] AI Engine docs at http://localhost:8002/docs
- [ ] Can register new user
- [ ] Can upload resume
- [ ] AI resume parsing works
- [ ] Can search jobs

### 10. Team/Cloud Database Test (Optional)
- [ ] cloud-sql-proxy connects successfully
- [ ] `DATABASE_URL` points to proxy
- [ ] Migrations run against Cloud SQL
- [ ] All services connect to cloud database

---

## 📚 DOCUMENTATION

### 11. Verify Documentation is Complete
- [ ] `README.md` - Architecture and overview (existing)
- [ ] `SETUP.md` - Friend setup instructions (✅ Created)
- [ ] `PRODUCTION_AUDIT_REPORT.md` - This audit (✅ Created)
- [ ] `PRODUCTION_CHECKLIST.md` - This checklist (✅ Created)
- [ ] `secrets/README.md` - Key management (✅ Created)

---

## 🚀 PRODUCTION DEPLOYMENT (Future)

### 12. Production Prerequisites
- [ ] Separate `docker-compose.prod.yml`
- [ ] SSL/TLS certificates configured
- [ ] Domain names registered and DNS configured
- [ ] Production database (Cloud SQL) ready
- [ ] Production GCS bucket created
- [ ] Secret Manager configured for sensitive values
- [ ] Cloud Run or GKE deployment configured
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Monitoring and alerting (Cloud Monitoring)
- [ ] Log aggregation (Cloud Logging)
- [ ] Database backup strategy

---

## 📋 FINAL VERIFICATION

### 13. Before Sharing with Friend
```bash
# 1. Verify no secrets in git
git log --all --full-history -- .env
# Should return nothing (files purged)

# 2. Verify secrets directory ignored
git check-ignore secrets/test.json
# Should return the path (meaning it's ignored)

# 3. Clean clone test
cd /tmp && rm -rf Smart-Placement-Tracker
git clone <repo-url>
cd Smart-Placement-Tracker
cp .env.example .env
# Fill in .env with test values
docker compose up --build -d
sleep 30
docker compose ps
# All services should show healthy
```

### 14. Verify Friend's Experience
- [ ] Friend can clone repo
- [ ] Friend can `cp .env.example .env`
- [ ] Friend can get own Gemini API key
- [ ] Friend can create own GCP bucket
- [ ] Friend can `docker compose up --build -d`
- [ ] Friend can run migrations
- [ ] Friend can access app at localhost:3000
- [ ] Friend can register and use app

---

## ⚠️ KNOWN LIMITATIONS

Document these for your friend:

1. **Resume Uploads** - Each developer needs their own GCS bucket or shared bucket permissions
2. **Database** - Local PostgreSQL is isolated per developer; Cloud SQL requires proxy
3. **Gemini API** - Each developer needs their own API key (free tier available)
4. **Google OAuth** - Each developer needs their own OAuth credentials for login

---

## ✅ SIGN-OFF

**Date:** ___________

**Auditor:** ___________

**Status:** ⬜ NOT READY / ⬜ READY FOR FRIEND / ⬜ READY FOR PRODUCTION

**Notes:**

_____________________________________

_____________________________________

