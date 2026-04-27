# Smart Placement Tracker - Friend Setup Guide

> **Goal:** Clone → Setup → Run successfully with zero machine dependency.

---

## Prerequisites

1. **Docker Desktop** installed and running
   - [Download for Mac/Windows](https://www.docker.com/products/docker-desktop/)

2. **Git** installed

3. **Google Cloud account** (for AI features and file storage)
   - [Sign up free](https://cloud.google.com/free)

4. **Gemini API key** (for resume parsing)
   - Get from: https://ai.google.dev/

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/your-username/Smart-Placement-Tracker.git
cd Smart-Placement-Tracker
```

---

## Step 2: Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env
```

Edit `.env` and fill in ALL required values:

### 2.1 Generate JWT Secret

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

Copy the output and set it as `JWT_SECRET` in `.env`.

### 2.2 Set Up Google Cloud Storage

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Enable the **Cloud Storage API**
4. Create a **bucket** for resume uploads
5. Go to **IAM & Admin** → **Service Accounts**
6. Create a service account with these roles:
   - `Storage Object Admin`
7. Create a **JSON key** and download it
8. Place the key file at: `./secrets/gcp-sa.json`

```bash
mkdir -p secrets
cp ~/Downloads/your-service-account-key.json secrets/gcp-sa.json
```

Set in `.env`:
```env
GCS_BUCKET_NAME=your-bucket-name
GCS_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/secrets/gcp-sa.json
```

### 2.3 Get Gemini API Key

1. Go to https://ai.google.dev/
2. Create API key
3. Set in `.env`:
```env
GEMINI_API_KEY=your-gemini-api-key
```

### 2.4 Set Up Google OAuth (Optional - for Google login)

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create **OAuth 2.0 Client ID** (Web application)
3. Add authorized redirect URI: `http://localhost:8000/api/v1/auth/google/callback`
4. Copy Client ID and Secret to `.env`:
```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback
FRONTEND_URL=http://localhost:3000
FRONTEND_URLS=http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173
```

### 2.5 Database Configuration

**Option A: Local PostgreSQL (Easiest for solo development)**
```env
DB_NAME=placement_tracker
DB_USER=postgres
DB_PASS=changeme
DB_HOST=postgres
DB_PORT=5432
DATABASE_URL=postgresql+asyncpg://postgres:changeme@postgres:5432/placement_tracker
REDIS_URL=redis://redis:6379/0
```

**Option B: Cloud SQL (For team collaboration)**
- Ask the team lead for:
  - Database password
  - cloud-sql-proxy setup instructions
  - Service account key for Cloud SQL

---

## Step 3: Build and Start Services

```bash
# Build all services
docker compose up --build -d

# Wait for services to be healthy (run a few times)
docker compose ps
```

You should see all services as `Up` or `Up (healthy)`.

---

## Step 4: Run Database Migrations

```bash
docker compose exec backend-api alembic upgrade head
```

Expected output:
```
INFO  [alembic.runtime.migration] Running upgrade  -> xxxxxxx, initial_schema
```

---

## Step 5: Verify Everything Works

| Service | URL | Check |
|---------|-----|-------|
| Frontend | http://localhost:3000 | App loads |
| Backend API | http://localhost:8000/docs | Swagger UI shows |
| AI Engine | http://localhost:8002/docs | Swagger UI shows |
| Health Check | http://localhost:8000/health | Returns `{"status": "ok"}` |

---

## Step 6: Create First User

1. Open http://localhost:3000
2. Click "Register" and create an account
3. Or use Google OAuth if configured

---

## Common Issues & Fixes

### Issue: "Cannot connect to GCS" or upload fails

**Cause:** `secrets/gcp-sa.json` missing or invalid

**Fix:**
```bash
# Verify file exists
ls -la secrets/gcp-sa.json

# Check it's valid JSON
cat secrets/gcp-sa.json | head -5

# Restart backend to pick up the file
docker compose restart backend-api
```

### Issue: "Gemini API error" or resume parsing fails

**Cause:** Invalid or missing GEMINI_API_KEY

**Fix:**
1. Get new key from https://ai.google.dev/
2. Update `.env`
3. Restart: `docker compose restart ai-engine`

### Issue: Database connection errors

**Cause:** PostgreSQL not ready or wrong DATABASE_URL

**Fix:**
```bash
# Check postgres is running
docker compose ps postgres

# View postgres logs
docker compose logs postgres

# If using local postgres, ensure DB_HOST=postgres (not localhost)
```

### Issue: "Unauthorized" or 401 errors on API calls

**Cause:** JWT_SECRET mismatch or expired tokens

**Fix:**
1. Clear browser localStorage (DevTools → Application → Local Storage)
2. Re-login

### Issue: CORS errors in browser console

**Cause:** FRONTEND_URLS not matching your actual frontend URL

**Fix:**
1. Check your browser's current URL (might be `127.0.0.1:3000` vs `localhost:3000`)
2. Update `.env` FRONTEND_URLS to include the actual origin
3. Restart: `docker compose restart backend-api ai-engine`

---

## Day-to-Day Commands

```bash
# Start all services (after computer restart)
docker compose up -d

# Stop all services
docker compose down

# View logs
docker compose logs -f

# View specific service logs
docker compose logs -f backend-api
docker compose logs -f ai-engine

# Restart a specific service
docker compose restart backend-api

# Run database migrations (after pulling new code)
docker compose exec backend-api alembic upgrade head
```

---

## Team Collaboration (Shared Database)

If using Google Cloud SQL with the team:

### Step 1: Get Required Files from Team Lead

- Service account key for Cloud SQL
- Database password
- Project ID and region

### Step 2: Download cloud-sql-proxy

**Mac:**
```bash
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.14.1/cloud-sql-proxy.darwin.arm64
chmod +x cloud-sql-proxy
```

**Windows:**
```powershell
Invoke-WebRequest -Uri "https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.14.1/cloud-sql-proxy.x64.exe" -OutFile "cloud-sql-proxy.exe"
```

### Step 3: Start cloud-sql-proxy

```bash
# Replace with your project details from team lead
GOOGLE_APPLICATION_CREDENTIALS=./secrets/cloud-sql-sa.json \
./cloud-sql-proxy \
  --address 0.0.0.0 \
  --port 5433 \
  your-project:your-region:your-instance
```

### Step 4: Configure .env for Proxy

```env
DB_USER=placement_user
DB_PASS=ask-team-lead
DB_NAME=placement_tracker
DB_HOST=host.docker.internal
DB_PORT=5433
DATABASE_URL=postgresql+asyncpg://placement_user:PASSWORD@host.docker.internal:5433/placement_tracker
```

### Step 5: Start Services

```bash
docker compose up -d
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Generate with `secrets.token_urlsafe(48)` |
| `GEMINI_API_KEY` | Yes | From https://ai.google.dev/ |
| `GCS_BUCKET_NAME` | Yes | GCS bucket for resumes |
| `GCS_PROJECT_ID` | Yes | GCP project ID |
| `GOOGLE_CLIENT_ID` | No | For Google OAuth |
| `GOOGLE_CLIENT_SECRET` | No | For Google OAuth |
| `REDIS_URL` | Yes | `redis://redis:6379/0` for Docker |
| `VITE_API_URL` | Yes | `http://localhost:8000/api/v1` |
| `FRONTEND_URLS` | Yes | CORS allowed origins |

---

## Need Help?

1. Check service logs: `docker compose logs -f [service-name]`
2. Verify health: `docker compose ps`
3. Check README.md for architecture details

---

## Security Reminders

- **NEVER** commit `.env` to git
- **NEVER** commit `secrets/` to git
- **NEVER** share API keys via email/Slack (use password manager)
- Rotate keys immediately if accidentally exposed

---

**You're all set!** 🚀 Open http://localhost:3000 and start tracking placements!
