#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Zero-Cost Deploy Script: backend-api to Cloud Run
# ─────────────────────────────────────────────────────────────────────────────
set -e

# Default to project, allow override via CLI: ./scripts/deploy_backend.sh [PROJECT_ID]
PROJECT="${1:-smart-placement-1792691409}"
REGION="asia-south1"
REPO="services"
# Load environment from .env if present
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

REDIS_URL="${REDIS_URL:-redis://localhost:6379/0}"
JWT_SECRET="${JWT_SECRET:-change-this-secret}"
GEMINI_API_KEY="${GEMINI_API_KEY:-}"

echo "🚀 Target Project: ${PROJECT} (${REGION})"

# Ensure Artifact Registry repository exists
gcloud artifacts repositories describe "${REPO}" --location="${REGION}" --project="${PROJECT}" &>/dev/null || \
gcloud artifacts repositories create "${REPO}" \
  --repository-format=docker \
  --location="${REGION}" \
  --description="Docker images" \
  --project="${PROJECT}"

echo "[1/3] Building backend Docker image (linux/amd64)..."
docker build --platform=linux/amd64 -t "${IMAGE}" -f backend-api/Dockerfile backend-api

echo "[2/3] Authenticating & Pushing image to Artifact Registry..."
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet
docker push "${IMAGE}"

echo "[3/3] Deploying backend-api to Cloud Run (min-instances=0 for ₹0 idle cost)..."
gcloud run deploy backend-api \
  --image="${IMAGE}" \
  --region="${REGION}" \
  --platform=managed \
  --allow-unauthenticated \
  --memory=1Gi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=3 \
  --port=8000 \
  --project="${PROJECT}" \
  --set-env-vars="^|^DATABASE_URL=sqlite+aiosqlite:////tmp/placement_tracker.db|REDIS_URL=${REDIS_URL}|JWT_SECRET=${JWT_SECRET}|GEMINI_API_KEY=${GEMINI_API_KEY}|FRONTEND_URL=https://smart-placement-trackerr.web.app|FRONTEND_URLS=https://smart-placement-trackerr.web.app,https://smart-placement-trackerr.firebaseapp.com,http://localhost:3000,http://localhost:5173" \
  --quiet

echo ""
echo "✅ backend-api deployed successfully with ₹0 idle cost!"
gcloud run services describe backend-api --region="${REGION}" --project="${PROJECT}" --format="value(status.url)"
