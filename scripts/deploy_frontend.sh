#!/bin/bash
set -e

FRONTEND_DIR="$(dirname "$0")/../frontend"
cd "$FRONTEND_DIR"

echo "[1/2] Building frontend with production env..."
npm run build

echo "[2/2] Deploying to Firebase Hosting (smart-placement-trackerr)..."
firebase deploy --only hosting --project smart-placement-trackerr

echo ""
echo "✅ Frontend deploy done."
echo "URL: https://smart-placement-trackerr.web.app"
