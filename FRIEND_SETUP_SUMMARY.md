# Friend Setup Summary
## What to Share & What Your Friend Needs to Do

---

## 📦 WHAT TO SHARE WITH YOUR FRIEND

### Files Your Friend Needs:

✅ **SHARE THESE (Safe to commit):**
```
Smart-Placement-Tracker/
├── README.md                    # Project overview
├── SETUP.md                     # Detailed setup instructions
├── PRODUCTION_AUDIT_REPORT.md   # Audit details (optional)
├── docker-compose.yml           # Docker configuration (✅ Fixed)
├── .env.example                 # Environment template (✅ Complete)
├── .gitignore                   # Git ignore rules (✅ Updated)
├── backend-api/                 # All backend code
├── ai-engine/                   # All AI engine code
├── frontend/                    # All frontend code
├── collector/                   # All collector code
├── secrets/                     # Empty directory with README.md only
│   └── README.md               # Instructions for GCP keys
└── nginx/                       # Nginx config (if any)
```

❌ **NEVER SHARE THESE:**
```
.env                    # Contains real secrets
.env.cloud             # Contains real secrets  
.env.local             # Your local config
secrets/*.json         # Service account keys
cloud-sql-proxy        # Platform-specific binary
.git/                  # Git history (may have secrets)
```

---

## 🔐 WHAT YOUR FRIEND NEEDS TO GET THEMSELVES

Your friend MUST obtain these themselves (you cannot share):

### 1. Gemini API Key (Free)
- **Where:** https://ai.google.dev/
- **Cost:** Free tier available
- **Time:** 2 minutes
- **They get:** An API key like `AIzaSy...`

### 2. Google Cloud Account (Free)
- **Where:** https://cloud.google.com/free
- **Cost:** $300 free credit, then pay-as-you-go
- **Time:** 5 minutes
- **They get:** A GCP project

### 3. Google Cloud Storage Bucket
- **Where:** https://console.cloud.google.com/storage
- **Cost:** ~$0.02/GB/month
- **Time:** 3 minutes
- **They get:** A bucket name like `friend-resume-bucket`

### 4. Google Cloud Service Account Key
- **Where:** https://console.cloud.google.com/iam-admin/serviceaccounts
- **Cost:** Free
- **Time:** 5 minutes
- **They get:** A JSON key file to place at `secrets/gcp-sa.json`

### 5. Google OAuth Credentials (Optional - for Google login)
- **Where:** https://console.cloud.google.com/apis/credentials
- **Cost:** Free
- **Time:** 5 minutes
- **They get:** Client ID and Secret

---

## 🚀 YOUR FRIEND'S SETUP STEPS

### Step 1: Clone & Setup (2 minutes)
```bash
git clone https://github.com/your-username/Smart-Placement-Tracker.git
cd Smart-Placement-Tracker
cp .env.example .env
```

### Step 2: Get API Keys (10 minutes)
1. Get Gemini API key → paste in `.env` as `GEMINI_API_KEY`
2. Create GCS bucket → paste name in `.env` as `GCS_BUCKET_NAME`
3. Download service account key → place at `secrets/gcp-sa.json`
4. Generate JWT secret → paste in `.env` as `JWT_SECRET`

### Step 3: Configure Database (Choose one)

**Option A: Local PostgreSQL (Easiest)**
```env
# .env
DB_NAME=placement_tracker
DB_USER=postgres
DB_PASS=changeme
DB_HOST=postgres
DB_PORT=5432
DATABASE_URL=postgresql+asyncpg://postgres:changeme@postgres:5432/placement_tracker
REDIS_URL=redis://redis:6379/0
```

**Option B: Use Your Cloud Database (Optional)**
- They need the database password from you
- They need to run cloud-sql-proxy
- They need Cloud SQL client service account key

### Step 4: Build & Run (5 minutes)
```bash
# Build everything
docker compose up --build -d

# Run database migrations
docker compose exec backend-api alembic upgrade head

# Check status
docker compose ps
```

### Step 5: Verify (1 minute)
- Open http://localhost:3000
- Should see the login page
- Can register new account

**Total Time: ~20 minutes**

---

## ❓ WHAT IF THEY DON'T WANT TO SET UP GCP?

### Without GCS (File Uploads Won't Work)
```env
# Leave these empty - uploads will fail gracefully
GCS_BUCKET_NAME=
GCS_PROJECT_ID=
GOOGLE_APPLICATION_CREDENTIALS=
```

**Impact:** Resume uploads will show error messages but rest of app works.

### Without Gemini (AI Features Won't Work)
```env
# Leave empty - AI features disabled
GEMINI_API_KEY=
```

**Impact:** Resume parsing and job matching will return errors.

### Without Google OAuth (Email/Password Only)
```env
# Leave these empty - login works with email/password
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

**Impact:** "Sign in with Google" button won't work, but email/password login works fine.

---

## 🧪 QUICK VERIFICATION TEST

After your friend completes setup, they should run:

```bash
# Check all services are healthy
docker compose ps

# Expected output:
# NAME                          STATUS
# smart-placement-postgres-1    Up (healthy)
# smart-placement-redis-1       Up (healthy)  
# smart-placement-backend-1       Up (healthy)
# smart-placement-ai-engine-1     Up (healthy)
# smart-placement-frontend-1      Up

# Check API is responding
curl http://localhost:8000/health
# Expected: {"status": "ok", "service": "backend-api"}

# Check AI Engine is responding
curl http://localhost:8002/health
# Expected: {"status": "ok", "service": "ai-engine"}
```

---

## 🔧 TROUBLESHOOTING FOR YOUR FRIEND

### "Cannot connect to GCS" Error
```bash
# Check secrets file exists
ls -la secrets/gcp-sa.json

# Check it's valid JSON
cat secrets/gcp-sa.json | head -5

# Restart backend
docker compose restart backend-api
```

### "Gemini API Error"
```bash
# Verify GEMINI_API_KEY is set
docker compose exec ai-engine env | grep GEMINI

# If empty, add to .env and restart
docker compose restart ai-engine
```

### Database Connection Error
```bash
# Check postgres is running
docker compose ps postgres

# View logs
docker compose logs postgres

# If using local postgres, check DB_HOST=postgres (not localhost)
```

---

## 📋 ENVIRONMENT VARIABLES CHEAT SHEET

| Variable | Friend's Value | Source |
|----------|---------------|--------|
| `GEMINI_API_KEY` | Their own key | https://ai.google.dev/ |
| `GCS_BUCKET_NAME` | Their bucket | GCP Console |
| `GCS_PROJECT_ID` | Their project | GCP Console |
| `JWT_SECRET` | Generated | `python3 -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `GOOGLE_CLIENT_ID` | Their OAuth | GCP Console (optional) |
| `GOOGLE_CLIENT_SECRET` | Their OAuth | GCP Console (optional) |
| `DATABASE_URL` | Local or Cloud | See SETUP.md |
| `VITE_API_URL` | `http://localhost:8000/api/v1` | Default |

---

## 🤝 IF THEY WANT TO USE YOUR SHARED DATABASE

### You Need to Provide:
1. Database password
2. Cloud SQL instance connection name
3. Service account key for Cloud SQL
4. Instructions to download cloud-sql-proxy

### They Need To:
1. Run cloud-sql-proxy locally
2. Set `DATABASE_URL` to point to proxy
3. Keep proxy running while developing

See "Team Collaboration" section in `SETUP.md` for details.

---

## ✅ FINAL CHECKLIST BEFORE SHARING

- [ ] Secrets purged from git history
- [ ] All API keys rotated
- [ ] `.env.example` is complete
- [ ] `docker-compose.yml` uses relative paths
- [ ] `SETUP.md` is clear and complete
- [ ] Tested fresh clone workflow
- [ ] Friend can successfully:
  - [ ] Clone repo
  - [ ] `cp .env.example .env`
  - [ ] Get their own API keys
  - [ ] `docker compose up --build -d`
  - [ ] Run migrations
  - [ ] Access app at localhost:3000

---

## 📞 SUPPORT

If your friend gets stuck:

1. Check `SETUP.md` first
2. Check service logs: `docker compose logs -f [service]`
3. Check `PRODUCTION_AUDIT_REPORT.md` for known issues
4. Create GitHub issue with error message

---

**Bottom Line:** Your friend needs their own GCP account and API keys. You provide the code, they provide the cloud resources. Takes ~20 minutes to set up.
