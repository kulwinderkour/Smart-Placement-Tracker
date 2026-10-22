#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Zero-Cost Deploy Script: ai-engine to Cloud Run
# ─────────────────────────────────────────────────────────────────────────────
set -e

PROJECT="${1:-smart-placement-1792691409}"
REGION="asia-south1"
REPO="services"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/${REPO}/ai-engine:latest"
# Load environment from .env if present
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

REDIS_URL="${REDIS_URL:-redis://localhost:6379/0}"
GEMINI_KEY="${GEMINI_API_KEY:-}"

echo "🚀 Target Project: ${PROJECT} (${REGION})"

# Ensure Artifact Registry repository exists
gcloud artifacts repositories describe "${REPO}" --location="${REGION}" --project="${PROJECT}" &>/dev/null || \
gcloud artifacts repositories create "${REPO}" \
  --repository-format=docker \
  --location="${REGION}" \
  --description="Docker images" \
  --project="${PROJECT}"

echo "[1/3] Building ai-engine Docker image (linux/amd64)..."
docker build --platform=linux/amd64 -t "${IMAGE}" -f ai-engine/Dockerfile ai-engine

echo "[2/3] Authenticating & Pushing image to Artifact Registry..."
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet
docker push "${IMAGE}"

echo "[3/3] Deploying ai-engine to Cloud Run (min-instances=0 for ₹0 idle cost)..."
gcloud run deploy ai-engine \
  --image="${IMAGE}" \
  --region="${REGION}" \
  --platform=managed \
  --allow-unauthenticated \
  --memory=1Gi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=3 \
  --port=8002 \
  --project="${PROJECT}" \
  --set-env-vars="^|^REDIS_URL=${REDIS_URL}|GEMINI_API_KEY=${GEMINI_KEY}|FRONTEND_URL=https://smart-placement-trackerr.web.app|FRONTEND_URLS=https://smart-placement-trackerr.web.app,https://smart-placement-trackerr.firebaseapp.com" \
  --quiet

echo ""
echo "✅ ai-engine deployed successfully with ₹0 idle cost!"
gcloud run services describe ai-engine --region="${REGION}" --project="${PROJECT}" --format="value(status.url)"
