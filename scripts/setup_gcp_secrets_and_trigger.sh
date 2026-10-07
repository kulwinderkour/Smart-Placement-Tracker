#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# setup_gcp_secrets_and_trigger.sh
# One-time setup: Cloud SQL, Artifact Registry, Secret Manager, IAM, Cloud Build trigger
# Account: amswami9273@gmail.com
# Project: smart-placement-trackerr (Firebase: smart-placement-trackerr)
# ═══════════════════════════════════════════════════════════════════════════════
# Prerequisites:
#   1. Billing account must be OPEN (add a payment method at console.cloud.google.com/billing)
#   2. gcloud auth: amswami9273@gmail.com must be active
#   3. GitHub repo connected to Cloud Build (GCP Console → Cloud Build → Triggers → Connect repo)
# ═══════════════════════════════════════════════════════════════════════════════
set -e

PROJECT="smart-placement-trackerr"
REGION="asia-south1"
DB_INSTANCE="smart-placement-db"
DB_NAME="placement_tracker"
DB_USER="placement_user"
DB_PASS="YourJasbir24"

echo "🔧 Project: ${PROJECT} | Account: $(gcloud config get-value account)"
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
  cloudresourcemanager.googleapis.com \
  iam.googleapis.com \
  --project="${PROJECT}"
echo "  ✓ APIs enabled"

echo ""
echo "═══════════════════════════════════════════════════"
echo " Step 2: Create Artifact Registry repository"
echo "═══════════════════════════════════════════════════"
gcloud artifacts repositories create services \
  --repository-format=docker \
  --location="${REGION}" \
  --description="Smart Placement Tracker Docker images" \
  --project="${PROJECT}" 2>/dev/null \
  && echo "  ✓ Created 'services' repo" \
  || echo "  ✓ Repo 'services' already exists"

echo ""
echo "═══════════════════════════════════════════════════"
echo " Step 3: Create Cloud SQL instance"
echo "═══════════════════════════════════════════════════"
if gcloud sql instances describe "${DB_INSTANCE}" --project="${PROJECT}" &>/dev/null; then
  echo "  ✓ Cloud SQL instance '${DB_INSTANCE}' already exists"
  # Make sure it's running
  gcloud sql instances patch "${DB_INSTANCE}" \
    --activation-policy=ALWAYS \
    --project="${PROJECT}" &>/dev/null \
    && echo "  ✓ Instance set to ALWAYS ON"
else
  echo "  Creating Cloud SQL PostgreSQL 15 instance (this takes ~5 min)..."
  gcloud sql instances create "${DB_INSTANCE}" \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region="${REGION}" \
    --storage-size=10GB \
    --storage-type=SSD \
    --activation-policy=ALWAYS \
    --project="${PROJECT}"
  echo "  ✓ Cloud SQL instance created"
fi

echo ""
echo "  Setting DB user password..."
gcloud sql users set-password "${DB_USER}" \
  --instance="${DB_INSTANCE}" \
  --password="${DB_PASS}" \
  --project="${PROJECT}" 2>/dev/null \
  || gcloud sql users create "${DB_USER}" \
       --instance="${DB_INSTANCE}" \
       --password="${DB_PASS}" \
       --project="${PROJECT}"
echo "  ✓ DB user '${DB_USER}' password set"

echo ""
echo "  Creating database '${DB_NAME}'..."
gcloud sql databases create "${DB_NAME}" \
  --instance="${DB_INSTANCE}" \
  --project="${PROJECT}" 2>/dev/null \
  && echo "  ✓ Database '${DB_NAME}' created" \
  || echo "  ✓ Database '${DB_NAME}' already exists"

echo ""
echo "═══════════════════════════════════════════════════"
echo " Step 4: Create GCS bucket for resumes"
echo "═══════════════════════════════════════════════════"
gsutil mb -l "${REGION}" -p "${PROJECT}" gs://smart-placement-resumes-prod 2>/dev/null \
  && echo "  ✓ Bucket created: gs://smart-placement-resumes-prod" \
  || echo "  ✓ Bucket already exists"

echo ""
echo "═══════════════════════════════════════════════════"
echo " Step 5: Create Secret Manager secrets"
echo "═══════════════════════════════════════════════════"

create_or_update_secret() {
  local NAME=$1
  local VALUE=$2
  if gcloud secrets describe "${NAME}" --project="${PROJECT}" &>/dev/null; then
    echo -n "${VALUE}" | gcloud secrets versions add "${NAME}" \
      --data-file=- --project="${PROJECT}" &>/dev/null
    echo "  ✓ Updated: ${NAME}"
  else
    echo -n "${VALUE}" | gcloud secrets create "${NAME}" \
      --data-file=- --project="${PROJECT}"
    echo "  ✓ Created: ${NAME}"
  fi
}

# Database URL — Unix socket format for Cloud Run
create_or_update_secret "backend-database-url" \
  "postgresql+asyncpg://${DB_USER}:${DB_PASS}/${DB_NAME}?host=/cloudsql/${PROJECT}:${REGION}:${DB_INSTANCE}"

# JWT
create_or_update_secret "backend-jwt-secret" \
  "ae6d184f9acc0ac011f79536b50d6be105d69c5cd3db605fc8411470151745e9"

# Gemini
create_or_update_secret "backend-gemini-key" \
  "AIzaSyCGaulj0nDfXD2mBNGFbirauLUmClaKYd4"

# Google OAuth
create_or_update_secret "backend-google-client-id" \
  "531859780857-7r6lj0bgjiuq42g04rln1idv9gupo1pg.apps.googleusercontent.com"

create_or_update_secret "backend-google-client-secret" \
  "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"

# Upstash Redis
create_or_update_secret "backend-upstash-url" \
  "https://helping-serval-82025.upstash.io"

create_or_update_secret "backend-upstash-token" \
  "ggAAAAAAAUBpAAIgcDJf_gtikN0MtzqStPFyj9N5zIW1zPsj4JO9Uw4Q44zwqg"

echo ""
echo "  ⚠️  Firebase CI token — run this separately:"
echo "      firebase login:ci"
echo "      echo -n 'PASTE_TOKEN' | gcloud secrets create firebase-ci-token --data-file=- --project=${PROJECT}"

echo ""
echo "═══════════════════════════════════════════════════"
echo " Step 6: Grant Cloud Build SA permissions"
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
    echo "  ✓ ${SECRET} → secretAccessor"
  fi
done

for ROLE in roles/run.admin roles/iam.serviceAccountUser roles/artifactregistry.writer roles/cloudsql.client; do
  gcloud projects add-iam-policy-binding "${PROJECT}" \
    --member="serviceAccount:${CB_SA}" \
    --role="${ROLE}" &>/dev/null
  echo "  ✓ ${ROLE} → Cloud Build SA"
done

echo ""
echo "═══════════════════════════════════════════════════"
echo " Step 7: Create Cloud Build trigger"
echo "═══════════════════════════════════════════════════"
echo ""
echo "  ⚠️  Connect GitHub repo FIRST:"
echo "      https://console.cloud.google.com/cloud-build/triggers?project=${PROJECT}"
echo "      → Connect Repository → GitHub → kulwinderkour/Smart-Placement-Tracker"
echo ""
gcloud builds triggers create github \
  --name=deploy-on-main \
  --repo-name=Smart-Placement-Tracker \
  --repo-owner=kulwinderkour \
  --branch-pattern='^main$' \
  --build-config=cloudbuild.yaml \
  --project="${PROJECT}" \
  --description="Deploy backend to Cloud Run + frontend to Firebase on push to main" \
  2>/dev/null \
  && echo "  ✓ Trigger 'deploy-on-main' created!" \
  || echo "  ⚠️  Trigger already exists or GitHub repo not connected yet — create via Console."

echo ""
echo "═══════════════════════════════════════════════════"
echo " ✅ Setup Complete!"
echo "═══════════════════════════════════════════════════"
echo ""
echo " Checklist:"
echo "  ✓ APIs enabled"
echo "  ✓ Artifact Registry repo 'services' ready"
echo "  ✓ Cloud SQL: ${DB_INSTANCE} (${DB_USER}@${DB_NAME})"
echo "  ✓ GCS bucket: smart-placement-resumes-prod"
echo "  ✓ Secret Manager secrets created"
echo "  ✓ Cloud Build SA permissions granted"
echo ""
echo " Still needed:"
echo "  [ ] Add payment method to billing account → https://console.cloud.google.com/billing"
echo "  [ ] Run: firebase login:ci → store token in Secret Manager"
echo "  [ ] Connect GitHub repo in Cloud Build console (if not done)"
echo "  [ ] Push to main → Cloud Build auto-deploys"
echo ""
echo " URLs after deploy:"
echo "  App:     https://smart-placement-trackerr.web.app"
echo "  Backend: https://backend-api-540820166501.asia-south1.run.app/health"
echo ""
