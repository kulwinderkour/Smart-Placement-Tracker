# 🚀 Smart Placement Tracker — GCP Deployment Architecture

> **Target:** Google Cloud Platform (Free Trial — $300 credits)
> **Domain:** Hostinger-managed custom domain
> **Stack:** React/Vite (Frontend) · FastAPI (Backend API) · FastAPI (AI Engine) · Node.js (Collector) · PostgreSQL · Redis
> **Date:** March 2026

---

## Table of Contents

1. [High-Level Architecture Overview](#1-high-level-architecture-overview)
2. [Detailed System Architecture](#2-detailed-system-architecture)
3. [Recommended GCP Services](#3-recommended-gcp-services)
4. [Docker Setup & Containerization](#4-docker-setup--containerization)
5. [CI/CD Pipeline](#5-cicd-pipeline)
6. [Database Setup](#6-database-setup)
7. [Networking — VPC, Firewall & HTTPS](#7-networking--vpc-firewall--https)
8. [Domain Integration (Hostinger → GCP)](#8-domain-integration-hostinger--gcp)
9. [Storage — Cloud Storage (GCS)](#9-storage--cloud-storage-gcs)
10. [Environment Variables & Secrets Management](#10-environment-variables--secrets-management)
11. [Scaling Strategy & Cost Optimization](#11-scaling-strategy--cost-optimization)
12. [Step-by-Step Deployment Guide](#12-step-by-step-deployment-guide)

---

## 1. High-Level Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           INTERNET / USER                               │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │  HTTPS (443)
                                ▼
                    ┌─────────────────────────┐
                    │   Hostinger DNS (A/CNAME)│
                    │   yourdomain.com         │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │  GCP Cloud Load Balancer │
                    │  + Managed SSL (HTTPS)   │
                    └────────────┬────────────┘
                                 │
               ┌─────────────────┼─────────────────────┐
               │                 │                       │
               ▼                 ▼                       ▼
      ┌──────────────┐  ┌───────────────┐    ┌──────────────────┐
      │  Frontend    │  │  backend-api  │    │   ai-engine      │
      │  React/Vite  │  │  FastAPI:8000 │    │   FastAPI:8002   │
      │  Cloud Run   │  │  Cloud Run    │    │   Cloud Run      │
      └──────────────┘  └──────┬────────┘    └──────────────────┘
                               │                       │
                    ┌──────────┴──────────┐            │
                    │                     │            │
                    ▼                     ▼            ▼
            ┌─────────────┐      ┌─────────────────────────┐
            │  Cloud SQL  │      │  Collector (Node.js)    │
            │ PostgreSQL  │◄─────│  Cloud Run (scheduled)  │
            └──────┬──────┘      └─────────────────────────┘
                   │
                   ▼
            ┌─────────────┐      ┌─────────────────────┐
            │  Redis      │      │  Cloud Storage (GCS)│
            │  Memorystore│      │  Resume uploads     │
            └─────────────┘      └─────────────────────┘
```

**Traffic Flow:**
1. User visits `yourdomain.com` → Hostinger DNS resolves → GCP Load Balancer
2. Load Balancer terminates HTTPS, routes to Cloud Run services by path
3. Frontend (React SPA) calls `/api/v1/*` → backend-api
4. backend-api calls ai-engine internally for AI tasks
5. Collector runs on a schedule to scrape jobs, calls ai-engine for enrichment
6. All services talk to Cloud SQL (PostgreSQL) and Redis (Memorystore) on a private VPC

---

## 2. Detailed System Architecture

### Service Map

| Service        | Technology       | Port | Cloud Run URL pattern         | Role                                |
|----------------|-----------------|------|-------------------------------|-------------------------------------|
| `frontend`     | React + Vite     | 3000 | `/` (root path)               | SPA served via Nginx container      |
| `backend-api`  | FastAPI (Python) | 8000 | `/api/v1/*`                   | Core REST API, auth, DB operations  |
| `ai-engine`    | FastAPI (Python) | 8002 | Internal only                 | AI question gen, skill analysis     |
| `collector`    | Node.js          | 8001 | Cloud Scheduler (cron 60min)  | Job scraper, feeds DB + ai-engine   |
| `postgres`     | Cloud SQL PG 15  | 5432 | Private IP (VPC)              | Primary relational database         |
| `redis`        | Memorystore      | 6379 | Private IP (VPC)              | Session cache, task queues          |

### Internal Communication (Service-to-Service)

```
frontend  ──HTTPS──►  backend-api  ──private VPC──►  ai-engine
                         │                                ▲
                         │                                │
                         ▼                                │
                     Cloud SQL  ◄──────────────  collector
                         ▲
                         │
                      Redis (Memorystore)
```

> **Rule:** `ai-engine` and `collector` are **not** publicly exposed. Only `frontend` and `backend-api` face the internet via the Load Balancer.

---

## 3. Recommended GCP Services

### Why Cloud Run (not Compute Engine or GKE)?

| Option          | Cost on Free Trial | Complexity | Best For                        |
|-----------------|--------------------|------------|---------------------------------|
| **Cloud Run** ✅ | Very low (scale-to-zero) | Low | Containerized stateless services |
| Compute Engine  | Always-on billing  | Medium     | VMs, legacy apps                |
| GKE             | High (3-node min)  | High       | Large-scale microservices       |

**Cloud Run** is ideal here because:
- Scales to **zero** when idle (saves credits)
- Fully managed — no VM to patch
- Supports any Docker container
- Built-in HTTPS per service
- Supports private service-to-service calls via VPC Connector

### Full GCP Service List

| GCP Service              | Purpose                                          | Free Tier?           |
|--------------------------|--------------------------------------------------|----------------------|
| **Cloud Run**            | Host all 4 application containers                | 2M req/month free    |
| **Cloud SQL (PG 15)**    | Managed PostgreSQL                               | No (use $300 credits)|
| **Memorystore (Redis)**  | Managed Redis for caching/queues                 | No (use credits)     |
| **Cloud Load Balancing** | Global HTTPS entry point + SSL termination       | Small cost           |
| **Artifact Registry**    | Store Docker images                              | 0.5 GB free          |
| **Cloud Storage (GCS)**  | Store resume uploads, static assets              | 5 GB free            |
| **Secret Manager**       | Store .env secrets securely                      | 6 secrets free       |
| **Cloud Scheduler**      | Trigger `collector` on a cron schedule           | 3 jobs free          |
| **Cloud Build**          | CI/CD — build & push Docker images               | 120 min/day free     |
| **VPC Network**          | Private networking between services              | Free                 |
| **Cloud DNS** (optional) | If managing DNS on GCP instead of Hostinger      | $0.20/zone/month     |

### Cost Estimate (Free Trial)

```
Cloud Run (4 services, low traffic): ~$5–15/month
Cloud SQL (db-f1-micro, 10GB):       ~$15–20/month
Memorystore (1GB Basic):             ~$25/month  ← biggest cost
Cloud Load Balancer:                 ~$18/month (forwarding rule)
Artifact Registry + Storage:         ~$2/month
─────────────────────────────────────────────────
Total estimate:                      ~$65–80/month
$300 credit covers ≈ 4–5 months
```

> 💡 **Tip:** If you want to stretch credits further, skip Memorystore and run Redis as a second container inside Cloud Run using a shared volume — acceptable for development/demo.

---

## 4. Docker Setup & Containerization

### 4.1 Production Dockerfile — `backend-api`

The existing Dockerfile uses `--reload` (dev mode). Update for production:

```dockerfile
# backend-api/Dockerfile
FROM python:3.12-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libpq5 && rm -rf /var/lib/apt/lists/*
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY . .
EXPOSE 8000
# Production: remove --reload, add workers
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

### 4.2 Production Dockerfile — `frontend`

The current Dockerfile serves via `vite dev`. For production, build a static bundle and serve with Nginx:

```dockerfile
# frontend/Dockerfile  (replace existing)
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:1.25-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Create `frontend/nginx.conf`:

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # Handle React Router (SPA fallback)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|svg|ico|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
```

### 4.3 Production Dockerfile — `ai-engine`

```dockerfile
# ai-engine/Dockerfile (production update)
FROM python:3.11-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev curl && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir \
    --extra-index-url https://download.pytorch.org/whl/cpu \
    -r requirements.txt && \
    pip install https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl

FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libpq5 && rm -rf /var/lib/apt/lists/*
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY . .
EXPOSE 8002
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8002", "--workers", "1"]
```

### 4.4 `.dockerignore` (add to each service root)

```
node_modules/
__pycache__/
*.pyc
.env
.env.*
.git/
uploads/
*.log
```

---

## 5. CI/CD Pipeline

### Using GitHub Actions + Cloud Build

```
Developer pushes to `main`
        │
        ▼
GitHub Actions triggers
        │
        ├─► Cloud Build: build & push images to Artifact Registry
        │
        └─► Cloud Run: deploy each service with new image tag
```

### 5.1 Create `cloudbuild.yaml` (project root)

```yaml
# cloudbuild.yaml
steps:
  # Build and push backend-api
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'REGION-docker.pkg.dev/PROJECT_ID/smart-tracker/backend-api:$SHORT_SHA', './backend-api']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'REGION-docker.pkg.dev/PROJECT_ID/smart-tracker/backend-api:$SHORT_SHA']

  # Build and push ai-engine
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'REGION-docker.pkg.dev/PROJECT_ID/smart-tracker/ai-engine:$SHORT_SHA', './ai-engine']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'REGION-docker.pkg.dev/PROJECT_ID/smart-tracker/ai-engine:$SHORT_SHA']

  # Build and push collector
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'REGION-docker.pkg.dev/PROJECT_ID/smart-tracker/collector:$SHORT_SHA', './collector']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'REGION-docker.pkg.dev/PROJECT_ID/smart-tracker/collector:$SHORT_SHA']

  # Build and push frontend (inject API URL at build time)
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '--build-arg'
      - 'VITE_API_URL=https://api.yourdomain.com/api/v1'
      - '-t'
      - 'REGION-docker.pkg.dev/PROJECT_ID/smart-tracker/frontend:$SHORT_SHA'
      - './frontend'
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'REGION-docker.pkg.dev/PROJECT_ID/smart-tracker/frontend:$SHORT_SHA']

  # Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run', 'deploy', 'backend-api'
      - '--image', 'REGION-docker.pkg.dev/PROJECT_ID/smart-tracker/backend-api:$SHORT_SHA'
      - '--region', 'asia-south1'
      - '--platform', 'managed'

images:
  - 'REGION-docker.pkg.dev/PROJECT_ID/smart-tracker/backend-api:$SHORT_SHA'
  - 'REGION-docker.pkg.dev/PROJECT_ID/smart-tracker/ai-engine:$SHORT_SHA'
  - 'REGION-docker.pkg.dev/PROJECT_ID/smart-tracker/collector:$SHORT_SHA'
  - 'REGION-docker.pkg.dev/PROJECT_ID/smart-tracker/frontend:$SHORT_SHA'
```

### 5.2 GitHub Actions Trigger (`.github/workflows/deploy.yml`)

```yaml
name: Deploy to GCP

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - id: auth
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      - name: Submit Cloud Build
        run: |
          gcloud builds submit \
            --config cloudbuild.yaml \
            --substitutions SHORT_SHA=${GITHUB_SHA::8} \
            --project ${{ secrets.GCP_PROJECT_ID }}
```

**GitHub Secrets to set:**
- `GCP_SA_KEY` — JSON key of a GCP Service Account with `Cloud Run Admin`, `Artifact Registry Writer`, `Cloud Build Editor` roles
- `GCP_PROJECT_ID` — your GCP project ID

---

## 6. Database Setup

### 6.1 Cloud SQL (PostgreSQL 15)

**Why Cloud SQL?**
- Managed patches, backups, and HA
- Connects to Cloud Run via **Cloud SQL Auth Proxy** (no public IP needed)
- Automatic daily backups (7-day retention on free credits)

**Recommended Instance:**
```
Type:           PostgreSQL 15
Machine type:   db-f1-micro (1 vCPU, 614 MB RAM) — cheapest
Storage:        10 GB SSD
Region:         asia-south1 (Mumbai) — low latency for Indian users
Connections:    Private IP only (no public IP for security)
```

**Create via gcloud:**
```bash
gcloud sql instances create smart-tracker-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=asia-south1 \
  --no-assign-ip \
  --network=default \
  --storage-size=10GB \
  --storage-type=SSD

gcloud sql databases create placement_tracker --instance=smart-tracker-db
gcloud sql users create postgres --instance=smart-tracker-db --password=YOUR_STRONG_PASSWORD
```

### 6.2 Connecting Cloud Run to Cloud SQL

Use the **Cloud SQL Auth Proxy** (built into Cloud Run natively):

```bash
# Deploy cloud run service with --add-cloudsql-instances flag
gcloud run deploy backend-api \
  --add-cloudsql-instances=PROJECT_ID:asia-south1:smart-tracker-db \
  --set-env-vars="DATABASE_URL=postgresql+asyncpg://postgres:PASSWORD@/placement_tracker?host=/cloudsql/PROJECT_ID:asia-south1:smart-tracker-db"
```

> Cloud Run automatically injects a Unix socket at `/cloudsql/...` — no proxy process needed.

### 6.3 Running Migrations

Create a one-off Cloud Run job for Alembic migrations:

```bash
gcloud run jobs create run-migrations \
  --image=REGION-docker.pkg.dev/PROJECT_ID/smart-tracker/backend-api:latest \
  --region=asia-south1 \
  --add-cloudsql-instances=PROJECT_ID:asia-south1:smart-tracker-db \
  --set-env-vars="DATABASE_URL=postgresql+asyncpg://..." \
  --command="alembic" \
  --args="upgrade,head"

# Execute migration
gcloud run jobs execute run-migrations
```

### 6.4 Redis (Memorystore)

```bash
gcloud redis instances create smart-tracker-redis \
  --size=1 \
  --region=asia-south1 \
  --tier=BASIC

# Get the IP
gcloud redis instances describe smart-tracker-redis --region=asia-south1
# Use this IP as REDIS_URL=redis://10.x.x.x:6379/0
```

> Memorystore is only accessible from within the same VPC — perfectly secure by default.

---

## 7. Networking — VPC, Firewall & HTTPS

### 7.1 Architecture

```
Internet
    │
    │ HTTPS:443
    ▼
┌─────────────────────────────────────────┐
│  GCP Global HTTP(S) Load Balancer       │
│  - Managed SSL certificate              │
│  - URL map: /* → frontend               │
│           /api/* → backend-api          │
└─────────────────────────────────────────┘
    │ (forwards to NEGs — Serverless NEGs for Cloud Run)
    ▼
┌─────────────────────────────────────────┐
│  Cloud Run Services (VPC-connected)     │
│  - frontend    (public ingress)         │
│  - backend-api (public ingress)         │
│  - ai-engine   (internal ingress only)  │
│  - collector   (no ingress — job only)  │
└─────────────────────────────────────────┘
    │
    │ Private IP (VPC)
    ▼
┌─────────────────────────────────────────┐
│  VPC Private Network                    │
│  - Cloud SQL PostgreSQL                 │
│  - Memorystore Redis                    │
└─────────────────────────────────────────┘
```

### 7.2 VPC Connector (Required for Cloud Run → Private Resources)

```bash
# Create a Serverless VPC Access connector
gcloud compute networks vpc-access connectors create smart-tracker-connector \
  --region=asia-south1 \
  --network=default \
  --range=10.8.0.0/28

# Use in Cloud Run deployments
gcloud run deploy backend-api \
  --vpc-connector=smart-tracker-connector \
  --vpc-egress=private-ranges-only
```

### 7.3 HTTPS Load Balancer Setup

```bash
# 1. Create a serverless NEG for each Cloud Run service
gcloud compute network-endpoint-groups create frontend-neg \
  --region=asia-south1 \
  --network-endpoint-type=serverless \
  --cloud-run-service=frontend

gcloud compute network-endpoint-groups create backend-api-neg \
  --region=asia-south1 \
  --network-endpoint-type=serverless \
  --cloud-run-service=backend-api

# 2. Create backend services
gcloud compute backend-services create frontend-backend \
  --global --load-balancing-scheme=EXTERNAL_MANAGED
gcloud compute backend-services add-backend frontend-backend \
  --global --network-endpoint-group=frontend-neg \
  --network-endpoint-group-region=asia-south1

gcloud compute backend-services create api-backend \
  --global --load-balancing-scheme=EXTERNAL_MANAGED
gcloud compute backend-services add-backend api-backend \
  --global --network-endpoint-group=backend-api-neg \
  --network-endpoint-group-region=asia-south1

# 3. URL map (routing rules)
gcloud compute url-maps create smart-tracker-urlmap \
  --default-service=frontend-backend

gcloud compute url-maps import smart-tracker-urlmap --global << 'EOF'
defaultService: projects/PROJECT_ID/global/backendServices/frontend-backend
hostRules:
  - hosts: ['yourdomain.com', 'www.yourdomain.com']
    pathMatcher: main
pathMatchers:
  - name: main
    defaultService: projects/PROJECT_ID/global/backendServices/frontend-backend
    pathRules:
      - paths: ['/api/*', '/api']
        service: projects/PROJECT_ID/global/backendServices/api-backend
EOF

# 4. Managed SSL certificate
gcloud compute ssl-certificates create smart-tracker-cert \
  --domains=yourdomain.com,www.yourdomain.com \
  --global

# 5. HTTPS Proxy + Forwarding Rule
gcloud compute target-https-proxies create smart-tracker-https-proxy \
  --url-map=smart-tracker-urlmap \
  --ssl-certificates=smart-tracker-cert \
  --global

gcloud compute forwarding-rules create smart-tracker-https-rule \
  --load-balancing-scheme=EXTERNAL_MANAGED \
  --network-tier=PREMIUM \
  --address=smart-tracker-ip \
  --target-https-proxy=smart-tracker-https-proxy \
  --global \
  --ports=443

# 6. HTTP → HTTPS redirect
gcloud compute url-maps import http-redirect --global << 'EOF'
defaultUrlRedirect:
  redirectResponseCode: MOVED_PERMANENTLY_DEFAULT
  httpsRedirect: true
EOF
```

### 7.4 Firewall Rules

```bash
# Allow internal VPC communication only (no public IP for DB/Redis)
# Cloud SQL and Memorystore are private by default — no extra rules needed.

# Allow health check probes from GCP load balancer
gcloud compute firewall-rules create allow-health-checks \
  --network=default \
  --action=ALLOW \
  --rules=tcp:8000,tcp:8002,tcp:8001,tcp:80 \
  --source-ranges=35.191.0.0/16,130.211.0.0/22
```

---

## 8. Domain Integration (Hostinger → GCP)

### 8.1 Reserve a Static IP on GCP

```bash
gcloud compute addresses create smart-tracker-ip \
  --network-tier=PREMIUM \
  --ip-version=IPV4 \
  --global

# Note the IP address
gcloud compute addresses describe smart-tracker-ip --global
# Output: address: 34.x.x.x
```

### 8.2 Configure Hostinger DNS

1. Log in to **Hostinger → Domains → DNS Zone Editor**
2. Delete the default `A` record for `@`
3. Add the following records:

| Type  | Name  | Value          | TTL  |
|-------|-------|----------------|------|
| A     | @     | `34.x.x.x`     | 3600 |
| A     | www   | `34.x.x.x`     | 3600 |
| CNAME | api   | `34.x.x.x`     | 3600 |

> Replace `34.x.x.x` with your actual GCP static IP.

### 8.3 Wait for SSL Certificate Provisioning

Google-managed SSL certs take **10–60 minutes** to provision after DNS propagates.

```bash
# Check certificate status
gcloud compute ssl-certificates describe smart-tracker-cert --global
# Wait until: status: ACTIVE
```

### 8.4 Verify

```bash
curl -I https://yourdomain.com
# Should return HTTP/2 200

curl -I https://yourdomain.com/api/v1/health
# Should return HTTP/2 200
```

---

## 9. Storage — Cloud Storage (GCS)

### 9.1 Why GCS Instead of Local Uploads?

Cloud Run containers are **ephemeral** — files saved locally are lost on restart. Use GCS for persistent file storage (resume uploads, etc.).

### 9.2 Setup

```bash
# Create bucket (asia-south1 for low latency)
gcloud storage buckets create gs://smart-tracker-uploads \
  --location=asia-south1 \
  --uniform-bucket-level-access

# Make public-readable (for resume downloads) — optional
gcloud storage buckets add-iam-policy-binding gs://smart-tracker-uploads \
  --member=allUsers \
  --role=roles/storage.objectViewer
```

### 9.3 Update Backend to Use GCS (replace AWS S3)

Install the GCS client:
```
google-cloud-storage
```

Replace your S3 upload code with:
```python
from google.cloud import storage

def upload_to_gcs(file_bytes: bytes, filename: str, content_type: str) -> str:
    client = storage.Client()
    bucket = client.bucket("smart-tracker-uploads")
    blob = bucket.blob(f"resumes/{filename}")
    blob.upload_from_string(file_bytes, content_type=content_type)
    return f"https://storage.googleapis.com/smart-tracker-uploads/resumes/{filename}"
```

> No API keys needed! Cloud Run uses the assigned **Service Account** automatically.

### 9.4 Update `.env.example`

Remove AWS variables. Add:
```
GCS_BUCKET_NAME=smart-tracker-uploads
```

---

## 10. Environment Variables & Secrets Management

### 10.1 Secret Manager Setup

**Never** put secrets in environment variables set in Cloud Run UI directly. Use **Secret Manager**:

```bash
# Create secrets
echo -n "your-strong-password" | \
  gcloud secrets create DB_PASS --data-file=-

echo -n "your-long-jwt-secret" | \
  gcloud secrets create JWT_SECRET --data-file=-

echo -n "sk-..." | \
  gcloud secrets create OPENAI_API_KEY --data-file=-

echo -n "your-gemini-key" | \
  gcloud secrets create GEMINI_API_KEY --data-file=-

echo -n "your-google-oauth-secret" | \
  gcloud secrets create GOOGLE_CLIENT_SECRET --data-file=-
```

### 10.2 Grant Cloud Run Access to Secrets

```bash
# Create a dedicated Service Account
gcloud iam service-accounts create smart-tracker-runner \
  --display-name="Smart Tracker Cloud Run SA"

# Grant Secret Manager access
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:smart-tracker-runner@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Grant Cloud SQL access
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:smart-tracker-runner@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

# Grant GCS access
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:smart-tracker-runner@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

### 10.3 Reference Secrets in Cloud Run Deploy

```bash
gcloud run deploy backend-api \
  --service-account=smart-tracker-runner@PROJECT_ID.iam.gserviceaccount.com \
  --set-secrets="DB_PASS=DB_PASS:latest,JWT_SECRET=JWT_SECRET:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest,GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest"
```

### 10.4 Non-Secret Environment Variables

Set these directly (they are not sensitive):

```bash
gcloud run deploy backend-api \
  --set-env-vars="\
DATABASE_URL=postgresql+asyncpg://postgres:$(gcloud secrets versions access latest --secret=DB_PASS)@/placement_tracker?host=/cloudsql/PROJECT_ID:asia-south1:smart-tracker-db,\
REDIS_URL=redis://10.x.x.x:6379/0,\
GOOGLE_CLIENT_ID=your-google-client-id,\
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/v1/auth/google/callback,\
FRONTEND_URL=https://yourdomain.com,\
ACCESS_TOKEN_EXPIRE_MINUTES=30,\
REFRESH_TOKEN_EXPIRE_DAYS=7,\
GCS_BUCKET_NAME=smart-tracker-uploads"
```

---

## 11. Scaling Strategy & Cost Optimization

### 11.1 Cloud Run Scaling Configuration

```bash
# backend-api: scale 0→3 instances
gcloud run services update backend-api \
  --min-instances=0 \
  --max-instances=3 \
  --concurrency=100 \
  --cpu=1 \
  --memory=512Mi

# ai-engine: heavier, fewer instances
gcloud run services update ai-engine \
  --min-instances=0 \
  --max-instances=2 \
  --concurrency=5 \
  --cpu=2 \
  --memory=2Gi

# frontend: scale aggressively (static assets = very fast)
gcloud run services update frontend \
  --min-instances=0 \
  --max-instances=5 \
  --concurrency=1000 \
  --cpu=1 \
  --memory=256Mi
```

### 11.2 Cost Optimization Tips

| Strategy | Saving | How |
|---|---|---|
| **Scale to zero** | ~60% | Set `min-instances=0` for all services |
| **Cold start mitigation** | latency only | Keep `min-instances=1` for backend-api if budget allows |
| **db-f1-micro** Cloud SQL | ~40% | Smallest tier, sufficient for dev/early prod |
| **Memorystore Basic tier** | ~30% | No replication overhead needed |
| **Artifact Registry cleanup** | Small | Delete old image tags after deploy |
| **Cloud Build caching** | ~50% build time | Use `--cache-from` in Dockerfiles |
| **Preemptible** (N/A here) | – | Cloud Run handles this automatically |
| **Region: asia-south1** | ~10% | Mumbai is cheaper than us-central1 |

### 11.3 Budget Alerts

Set up a budget alert to avoid surprise charges after trial ends:

```bash
# In GCP Console: Billing → Budgets & Alerts
# Create budget: $250 (leave $50 buffer before trial ends)
# Alert at: 50%, 75%, 90%, 100%
```

### 11.4 Scaling Architecture Diagram

```
Low Traffic (Night)          High Traffic (Day)
┌─────────────┐              ┌─────────────────────────┐
│ 0 instances │  ──────────► │ Auto-scaled: 1–3 pods   │
│ (sleeping)  │              │ Cold start: ~2–3s        │
└─────────────┘              └─────────────────────────┘
        ▲                              ▲
        │ 0 cost                       │ Pay per request
```

---

## 12. Step-by-Step Deployment Guide

### Prerequisites

```bash
# Install gcloud CLI
brew install google-cloud-sdk
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud config set run/region asia-south1

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  sql-component.googleapis.com \
  sqladmin.googleapis.com \
  redis.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  compute.googleapis.com \
  vpcaccess.googleapis.com \
  cloudscheduler.googleapis.com \
  storage.googleapis.com
```

### Step 1: Create Artifact Registry

```bash
gcloud artifacts repositories create smart-tracker \
  --repository-format=docker \
  --location=asia-south1 \
  --description="Smart Tracker Docker images"

# Authenticate Docker with Artifact Registry
gcloud auth configure-docker asia-south1-docker.pkg.dev
```

### Step 2: Create Infrastructure (Cloud SQL + Redis + VPC)

```bash
# 2a. VPC Connector
gcloud compute networks vpc-access connectors create smart-tracker-connector \
  --region=asia-south1 \
  --network=default \
  --range=10.8.0.0/28

# 2b. Cloud SQL
gcloud sql instances create smart-tracker-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=asia-south1 \
  --no-assign-ip \
  --network=default
gcloud sql databases create placement_tracker --instance=smart-tracker-db
gcloud sql users create postgres --instance=smart-tracker-db --password=STRONG_PASSWORD

# 2c. Redis (Memorystore)
gcloud redis instances create smart-tracker-redis \
  --size=1 --region=asia-south1 --tier=BASIC
REDIS_IP=$(gcloud redis instances describe smart-tracker-redis \
  --region=asia-south1 --format='get(host)')

# 2d. GCS Bucket
gcloud storage buckets create gs://smart-tracker-uploads \
  --location=asia-south1 --uniform-bucket-level-access
```

### Step 3: Set Up Secrets

```bash
echo -n "STRONG_PASSWORD" | gcloud secrets create DB_PASS --data-file=-
echo -n "$(openssl rand -hex 32)" | gcloud secrets create JWT_SECRET --data-file=-
echo -n "sk-YOUR_KEY" | gcloud secrets create OPENAI_API_KEY --data-file=-
echo -n "YOUR_GEMINI_KEY" | gcloud secrets create GEMINI_API_KEY --data-file=-
echo -n "your-google-client-secret" | gcloud secrets create GOOGLE_CLIENT_SECRET --data-file=-
```

### Step 4: Create Service Account

```bash
gcloud iam service-accounts create smart-tracker-runner \
  --display-name="Smart Tracker Runner"

SA="smart-tracker-runner@PROJECT_ID.iam.gserviceaccount.com"
gcloud projects add-iam-policy-binding PROJECT_ID --member="serviceAccount:$SA" --role=roles/secretmanager.secretAccessor
gcloud projects add-iam-policy-binding PROJECT_ID --member="serviceAccount:$SA" --role=roles/cloudsql.client
gcloud projects add-iam-policy-binding PROJECT_ID --member="serviceAccount:$SA" --role=roles/storage.objectAdmin
```

### Step 5: Build & Push Docker Images

```bash
PROJECT_ID="your-project-id"
REGION="asia-south1"
REGISTRY="$REGION-docker.pkg.dev/$PROJECT_ID/smart-tracker"
TAG="v1.0.0"

# Build all images
docker build -t $REGISTRY/backend-api:$TAG ./backend-api
docker build -t $REGISTRY/ai-engine:$TAG ./ai-engine
docker build -t $REGISTRY/collector:$TAG ./collector
docker build \
  --build-arg VITE_API_URL=https://yourdomain.com/api/v1 \
  -t $REGISTRY/frontend:$TAG ./frontend

# Push all images
docker push $REGISTRY/backend-api:$TAG
docker push $REGISTRY/ai-engine:$TAG
docker push $REGISTRY/collector:$TAG
docker push $REGISTRY/frontend:$TAG
```

### Step 6: Run Database Migrations

```bash
# Create a Cloud Run Job for migrations
gcloud run jobs create run-migrations \
  --image=$REGISTRY/backend-api:$TAG \
  --region=asia-south1 \
  --service-account=$SA \
  --vpc-connector=smart-tracker-connector \
  --add-cloudsql-instances=PROJECT_ID:asia-south1:smart-tracker-db \
  --set-secrets="DB_PASS=DB_PASS:latest" \
  --set-env-vars="DATABASE_URL=postgresql+asyncpg://postgres:STRONG_PASSWORD@/placement_tracker?host=/cloudsql/PROJECT_ID:asia-south1:smart-tracker-db" \
  --command=alembic \
  --args=upgrade,head

gcloud run jobs execute run-migrations --region=asia-south1 --wait
```

### Step 7: Deploy Cloud Run Services

```bash
# Common flags
COMMON="--region=asia-south1 --service-account=$SA \
  --vpc-connector=smart-tracker-connector \
  --vpc-egress=private-ranges-only \
  --add-cloudsql-instances=PROJECT_ID:asia-south1:smart-tracker-db \
  --set-secrets=DB_PASS=DB_PASS:latest,JWT_SECRET=JWT_SECRET:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest"

DATABASE_URL="postgresql+asyncpg://postgres:\${DB_PASS}@/placement_tracker?host=/cloudsql/PROJECT_ID:asia-south1:smart-tracker-db"

# Deploy ai-engine (internal only)
gcloud run deploy ai-engine \
  --image=$REGISTRY/ai-engine:$TAG \
  --no-allow-unauthenticated \
  --ingress=internal \
  --memory=2Gi --cpu=2 --min-instances=0 --max-instances=2 \
  --set-env-vars="DATABASE_URL=$DATABASE_URL" \
  $COMMON

AI_ENGINE_URL=$(gcloud run services describe ai-engine --region=asia-south1 --format='get(status.url)')

# Deploy backend-api (public, routed via LB)
gcloud run deploy backend-api \
  --image=$REGISTRY/backend-api:$TAG \
  --allow-unauthenticated \
  --ingress=all \
  --port=8000 \
  --memory=512Mi --cpu=1 --min-instances=0 --max-instances=3 \
  --set-env-vars="DATABASE_URL=$DATABASE_URL,REDIS_URL=redis://$REDIS_IP:6379/0,AI_ENGINE_URL=$AI_ENGINE_URL,FRONTEND_URL=https://yourdomain.com,GOOGLE_CLIENT_ID=your-client-id,GOOGLE_REDIRECT_URI=https://yourdomain.com/api/v1/auth/google/callback,GCS_BUCKET_NAME=smart-tracker-uploads" \
  $COMMON

# Deploy collector (internal scheduled job)
gcloud run deploy collector \
  --image=$REGISTRY/collector:$TAG \
  --no-allow-unauthenticated \
  --ingress=internal \
  --memory=512Mi --cpu=1 --min-instances=0 --max-instances=1 \
  --set-env-vars="DATABASE_URL=postgresql://postgres:\${DB_PASS}@/placement_tracker?host=/cloudsql/PROJECT_ID:asia-south1:smart-tracker-db,AI_ENGINE_URL=$AI_ENGINE_URL" \
  $COMMON

# Deploy frontend (public, static assets)
gcloud run deploy frontend \
  --image=$REGISTRY/frontend:$TAG \
  --allow-unauthenticated \
  --ingress=all \
  --port=80 \
  --memory=256Mi --cpu=1 --min-instances=0 --max-instances=5 \
  --region=asia-south1
```

### Step 8: Set Up Cloud Scheduler for Collector

```bash
COLLECTOR_URL=$(gcloud run services describe collector --region=asia-south1 --format='get(status.url)')

gcloud scheduler jobs create http scrape-jobs \
  --location=asia-south1 \
  --schedule="0 * * * *" \
  --uri="$COLLECTOR_URL/scrape" \
  --http-method=POST \
  --oidc-service-account-email=$SA \
  --message-body='{}'
```

### Step 9: Set Up Load Balancer

Follow the commands in **Section 7.3** above. The key steps are:
1. Reserve static IP → `smart-tracker-ip`
2. Create serverless NEGs for `frontend` and `backend-api`
3. Create URL map with path rule `/api/*` → backend-api
4. Create managed SSL cert for your domain
5. Create HTTPS proxy + forwarding rule on port 443
6. Create HTTP → HTTPS redirect on port 80

### Step 10: Configure Hostinger DNS

Follow **Section 8.2** to point your Hostinger domain to the GCP static IP.

Wait for DNS propagation (5–60 min) and SSL provisioning (10–60 min).

### Step 11: Verify Everything Works

```bash
# Check all Cloud Run services are healthy
gcloud run services list --region=asia-south1

# Test endpoints
curl https://yourdomain.com                          # Frontend (200 OK)
curl https://yourdomain.com/api/v1/health            # Backend health (200 OK)

# Check SSL
curl -vI https://yourdomain.com 2>&1 | grep "SSL certificate"

# Check Cloud SQL
gcloud sql instances list

# Check Redis
gcloud redis instances list --region=asia-south1
```

### Step 12: Set Up GitHub Actions CI/CD (Optional but Recommended)

1. Create a Service Account key for GitHub Actions:
```bash
gcloud iam service-accounts keys create /tmp/gcp-sa-key.json \
  --iam-account=smart-tracker-runner@PROJECT_ID.iam.gserviceaccount.com
```

2. Add the contents of `/tmp/gcp-sa-key.json` as a GitHub secret named `GCP_SA_KEY`
3. Add `GCP_PROJECT_ID` as another secret
4. Copy the `cloudbuild.yaml` from Section 5.1 to your project root
5. Copy the `.github/workflows/deploy.yml` from Section 5.2

From now on, every push to `main` will automatically rebuild and redeploy all services.

---

## Architecture Summary Diagram

```
                              HOSTINGER DNS
                              yourdomain.com → 34.x.x.x
                                      │
                                      ▼
                         ┌────────────────────────┐
                         │  GCP Static IP          │
                         │  34.x.x.x               │
                         └──────────┬─────────────-┘
                                    │
                         ┌──────────▼─────────────-┐
                         │  HTTPS Load Balancer     │
                         │  Managed SSL (Let's Enc) │
                         │  HTTP→HTTPS redirect     │
                         └──────┬─────────┬────────-┘
                                │         │
              /* (frontend)     │         │  /api/* (backend)
                                ▼         ▼
                    ┌──────────────┐ ┌──────────────────┐
                    │  Cloud Run   │ │  Cloud Run        │
                    │  frontend    │ │  backend-api      │
                    │  Nginx+React │ │  FastAPI          │
                    │  (public)    │ │  (public)         │
                    └──────────────┘ └────────┬─────────┘
                                              │
                              ┌───────────────┤
                              │               │
                              ▼               ▼
               ┌──────────────────┐  ┌───────────────────┐
               │  Cloud Run       │  │  Cloud Run        │
               │  ai-engine       │  │  collector        │
               │  (internal only) │  │  (scheduler only) │
               └──────────────────┘  └───────────────────┘
                              │               │
                              └───────┬───────┘
                                      │ Private VPC
                          ┌───────────┼──────────────┐
                          │           │              │
                          ▼           ▼              ▼
                  ┌──────────────┐ ┌──────────┐ ┌────────────┐
                  │  Cloud SQL   │ │ Redis    │ │  GCS       │
                  │  PostgreSQL  │ │ Memory-  │ │  Uploads   │
                  │  (private IP)│ │ store    │ │  Bucket    │
                  └──────────────┘ └──────────┘ └────────────┘

GitHub → Cloud Build → Artifact Registry → Cloud Run (CI/CD)
```

---

## Quick Reference

| What | Where | Command |
|---|---|---|
| View logs | Cloud Run | `gcloud run services logs read backend-api --region=asia-south1` |
| Update a service | Cloud Run | `gcloud run deploy SERVICE --image=NEW_IMAGE` |
| Access DB shell | Cloud SQL | `gcloud sql connect smart-tracker-db --user=postgres` |
| Rotate a secret | Secret Manager | `gcloud secrets versions add SECRET_NAME --data-file=-` |
| Check LB status | Compute | `gcloud compute ssl-certificates describe smart-tracker-cert --global` |
| View billing | GCP Console | Billing → Reports |
| Check budget | GCP Console | Billing → Budgets & Alerts |

---

*Generated for Smart Placement Tracker — March 2026*
*Architecture targets GCP Free Trial ($300 credits) with Hostinger custom domain*
