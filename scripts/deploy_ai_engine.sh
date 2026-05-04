#!/bin/bash
set -e

echo "[1/1] Deploying ai-engine to Cloud Run..."

gcloud run deploy ai-engine \
  --image=asia-south1-docker.pkg.dev/smart-placement-prod/services/ai-engine:latest \
  --region=asia-south1 \
  --platform=managed \
  --allow-unauthenticated \
  --memory=2Gi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=3 \
  --port=8002 \
  --set-env-vars="^|^REDIS_URL=redis://default:AYljAAIncDJhYjI0NjA3MjVjMWE0N2FkOWQ1NGFlMTc3MTBjYmQwNXAyODIwMjU@helping-serval-82025.upstash.io:6379|GEMINI_API_KEY=AIzaSyCGaulj0nDfXD2mBNGFbirauLUmClaKYd4|BACKEND_URL=https://backend-api-385144446825.asia-south1.run.app|FRONTEND_URL=https://smart-placement-pro.web.app|FRONTEND_URLS=https://smart-placement-pro.web.app,https://smart-placement-pro.firebaseapp.com" \
  --quiet

echo "ai-engine deploy done."
echo "URL: https://ai-engine-385144446825.asia-south1.run.app"
