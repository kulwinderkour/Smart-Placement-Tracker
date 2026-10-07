#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# setup_gcp_secrets_and_trigger.sh
# One-time setup: Create Secret Manager secrets + Cloud Build trigger
# Account: amswami9273@gmail.com
# Project: smart-placement-prod
# ═══════════════════════════════════════════════════════════════════════════════
# Run this ONCE after:
#   1. Billing is re-enabled on smart-placement-prod
#   2. You are logged in: gcloud auth login amswami9273@gmail.com
#   3. GitHub repo is connected to Cloud Build (via GCP Console → Cloud Build → Triggers → Connect repo)
# ═══════════════════════════════════════════════════════════════════════════════
set -e

PROJECT="smart-placement-prod"
REGION="asia-south1"

echo "🔧 Using project: ${PROJECT}"
gcloud config set project "${PROJECT}"

echo ""
echo "═══════════════════════════════════════════════════"
echo " Step 1: Enable required APIs"
echo "═══════════════════════════════════════════════════"
gcloud services enable \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  sqladmin.googleapis.com \
  --project="${PROJECT}"

echo ""
echo "═══════════════════════════════════════════════════"
echo " Step 2: Create Artifact Registry repository"
echo "═══════════════════════════════════════════════════"
gcloud artifacts repositories create services \
  --repository-format=docker \
  --location="${REGION}" \
  --description="Smart Placement Tracker services" \
  --project="${PROJECT}" 2>/dev/null || echo "  ✓ Artifact Registry repo 'services' already exists"

echo ""
echo "═══════════════════════════════════════════════════"
echo " Step 3: Create Secret Manager secrets"
echo "═══════════════════════════════════════════════════"

create_secret() {
  local NAME=$1
  local VALUE=$2
  if gcloud secrets describe "${NAME}" --project="${PROJECT}" &>/dev/null; then
    echo "  Updating existing secret: ${NAME}"
    echo -n "${VALUE}" | gcloud secrets versions add "${NAME}" \
      --data-file=- --project="${PROJECT}"
  else
    echo "  Creating new secret: ${NAME}"
    echo -n "${VALUE}" | gcloud secrets create "${NAME}" \
      --data-file=- --project="${PROJECT}"
  fi
}

# Database URL (Cloud SQL via Unix socket for Cloud Run)
create_secret "backend-database-url" \
  "postgresql+asyncpg://placement_user:Jasbir24/placement_tracker?host=/cloudsql/smart-placement-prod:asia-south1:smart-placement-db"

# JWT secret
create_secret "backend-jwt-secret" \
  "ae6d184f9acc0ac011f79536b50d6be105d69c5cd3db605fc8411470151745e9"

# Gemini API key
create_secret "backend-gemini-key" \
  "AIzaSyCGaulj0nDfXD2mBNGFbirauLUmClaKYd4"

# Google OAuth
create_secret "backend-google-client-id" \
  "531859780857-7r6lj0bgjiuq42g04rln1idv9gupo1pg.apps.googleusercontent.com"

create_secret "backend-google-client-secret" \
  "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"

# Upstash Redis
create_secret "backend-upstash-url" \
  "https://helping-serval-82025.upstash.io"

create_secret "backend-upstash-token" \
  "AYljAAIncDJhYjI0NjA3MjVjMWE0N2FkOWQ1NGFlMTc3MTBjYmQwNXAyODIwMjU"

echo ""
echo "  ⚠️  For the Firebase CI token, run:"
echo "      firebase login:ci"
echo "  Then run:"
echo "      echo -n 'YOUR_TOKEN' | gcloud secrets create firebase-ci-token --data-file=- --project=${PROJECT}"
echo "  (or update if it already exists):"
echo "      echo -n 'YOUR_TOKEN' | gcloud secrets versions add firebase-ci-token --data-file=- --project=${PROJECT}"

echo ""
echo "═══════════════════════════════════════════════════"
echo " Step 4: Grant Cloud Build SA access to secrets"
echo "═══════════════════════════════════════════════════"
PROJECT_NUMBER=$(gcloud projects describe "${PROJECT}" --format="value(projectNumber)")
CB_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

echo "  Cloud Build SA: ${CB_SA}"

for SECRET in backend-database-url backend-jwt-secret backend-gemini-key \
              backend-google-client-id backend-google-client-secret \
              backend-upstash-url backend-upstash-token firebase-ci-token; do
  if gcloud secrets describe "${SECRET}" --project="${PROJECT}" &>/dev/null; then
    gcloud secrets add-iam-policy-binding "${SECRET}" \
      --member="serviceAccount:${CB_SA}" \
      --role="roles/secretmanager.secretAccessor" \
      --project="${PROJECT}" &>/dev/null
    echo "  ✓ ${SECRET} → Cloud Build access granted"
  else
    echo "  ⚠️  Secret ${SECRET} doesn't exist yet — skipping IAM binding"
  fi
done

# Also grant Cloud Build the right roles
gcloud projects add-iam-policy-binding "${PROJECT}" \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/run.admin" &>/dev/null && echo "  ✓ roles/run.admin → Cloud Build"

gcloud projects add-iam-policy-binding "${PROJECT}" \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/iam.serviceAccountUser" &>/dev/null && echo "  ✓ roles/iam.serviceAccountUser → Cloud Build"

gcloud projects add-iam-policy-binding "${PROJECT}" \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/artifactregistry.writer" &>/dev/null && echo "  ✓ roles/artifactregistry.writer → Cloud Build"

echo ""
echo "═══════════════════════════════════════════════════"
echo " Step 5: Create Cloud Build trigger (GitHub → main)"
echo "═══════════════════════════════════════════════════"
echo ""
echo "  ⚠️  IMPORTANT: Before running this, you must connect the GitHub repo"
echo "      in GCP Console → Cloud Build → Triggers → Connect repository"
echo "      (kulwinderkour/Smart-Placement-Tracker)"
echo ""

gcloud builds triggers create github \
  --name=deploy-on-main \
  --repo-name=Smart-Placement-Tracker \
  --repo-owner=kulwinderkour \
  --branch-pattern='^main$' \
  --build-config=cloudbuild.yaml \
  --project="${PROJECT}" \
  --description="Deploy backend to Cloud Run + frontend to Firebase on push to main" \
  2>/dev/null && echo "  ✓ Cloud Build trigger 'deploy-on-main' created!" \
  || echo "  ⚠️  Trigger already exists or GitHub repo not connected yet."

echo ""
echo "═══════════════════════════════════════════════════"
echo " ✅ Setup complete!"
echo "═══════════════════════════════════════════════════"
echo ""
echo " Next steps:"
echo "  1. Re-enable billing at: https://console.cloud.google.com/billing?project=${PROJECT}"
echo "  2. Connect GitHub repo: https://console.cloud.google.com/cloud-build/triggers?project=${PROJECT}"
echo "  3. Run: firebase login:ci → store token in firebase-ci-token secret"
echo "  4. Push to main → Cloud Build auto-deploys everything"
echo "  5. Check backend health: https://backend-api-385144446825.asia-south1.run.app/health"
echo "  6. Check app: https://smart-placement-trackerr.web.app"
echo ""
