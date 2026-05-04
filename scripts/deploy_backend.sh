#!/bin/bash
set -e

echo "[1/1] Deploying backend-api to Cloud Run..."

gcloud run deploy backend-api \
  --image=asia-south1-docker.pkg.dev/smart-placement-prod/services/backend-api:latest \
  --region=asia-south1 \
  --platform=managed \
  --allow-unauthenticated \
  --memory=1Gi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=3 \
  --port=8000 \
  --set-env-vars="^|^DATABASE_URL=postgresql+asyncpg://placement_user:Jasbir24@35.200.187.154:5432/placement_tracker|REDIS_URL=redis://default:AYljAAIncDJhYjI0NjA3MjVjMWE0N2FkOWQ1NGFlMTc3MTBjYmQwNXAyODIwMjU@helping-serval-82025.upstash.io:6379|UPSTASH_REDIS_REST_URL=https://helping-serval-82025.upstash.io|UPSTASH_REDIS_REST_TOKEN=gQAAAAAAAUBpAAIncDJhYjI0NjA3MjVjMWE0N2FkOWQ1NGFlMTc3MTBjYmQwNXAyODIwMjU|JWT_SECRET=ae6d184f9acc0ac011f79536b50d6be105d69c5cd3db605fc8411470151745e9|GOOGLE_CLIENT_ID=531859780857-7r6lj0bgjiuq42g04rln1idv9gupo1pg.apps.googleusercontent.com|GOOGLE_CLIENT_SECRET=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|GOOGLE_REDIRECT_URI=https://backend-api-385144446825.asia-south1.run.app/api/v1/auth/google/callback|FRONTEND_URL=https://smart-placement-pro.web.app|FRONTEND_URLS=https://smart-placement-pro.web.app,https://smart-placement-pro.firebaseapp.com|GCS_BUCKET_NAME=smart-placement-resumes-prod|GCS_PROJECT_ID=smart-placement-prod|GEMINI_API_KEY=AIzaSyCGaulj0nDfXD2mBNGFbirauLUmClaKYd4" \
  --quiet

echo "backend-api deploy done."
echo "URL: https://backend-api-385144446825.asia-south1.run.app"
