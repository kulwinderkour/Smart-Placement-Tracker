#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Manual deploy script — backend-api to Cloud Run
# Project: smart-placement-prod | Account: amswami9273@gmail.com
# For automated deploys, push to main → Cloud Build trigger fires (cloudbuild.yaml)
# ─────────────────────────────────────────────────────────────────────────────
set -e

PROJECT="smart-placement-trackerr"
REGION="asia-south1"
IMAGE="asia-south1-docker.pkg.dev/${PROJECT}/services/backend-api:latest"

echo "[1/3] Building backend Docker image..."
docker build -t "${IMAGE}" -f backend-api/Dockerfile backend-api

echo "[2/3] Pushing image to Artifact Registry..."
docker push "${IMAGE}"

echo "[3/3] Deploying backend-api to Cloud Run..."
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
  --set-secrets="DATABASE_URL=backend-database-url:latest,JWT_SECRET=backend-jwt-secret:latest,GEMINI_API_KEY=backend-gemini-key:latest,GOOGLE_CLIENT_ID=backend-google-client-id:latest,GOOGLE_CLIENT_SECRET=backend-google-client-secret:latest,UPSTASH_REDIS_REST_URL=backend-upstash-url:latest,UPSTASH_REDIS_REST_TOKEN=backend-upstash-token:latest" \
  --update-env-vars="FRONTEND_URL=https://smart-placement-trackerr.web.app,FRONTEND_URLS=https://smart-placement-trackerr.web.app,https://smart-placement-trackerr.firebaseapp.com,GOOGLE_REDIRECT_URI=https://backend-api-540820166501.asia-south1.run.app/api/v1/auth/google/callback,GCS_BUCKET_NAME=smart-placement-resumes-prod,GCS_PROJECT_ID=smart-placement-trackerr" \
  --add-cloudsql-instances=smart-placement-trackerr:asia-south1:smart-placement-db \
  --quiet

echo ""
echo "✅ backend-api deployed successfully."
echo "   URL: https://backend-api-385144446825.asia-south1.run.app"
echo "   Health: https://backend-api-385144446825.asia-south1.run.app/health"
