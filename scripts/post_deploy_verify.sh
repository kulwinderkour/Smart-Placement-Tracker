#!/bin/bash
# Post-deploy verification: health checks + parity test against production URLs
set -e

BACKEND="https://backend-api-385144446825.asia-south1.run.app"
AI="https://ai-engine-385144446825.asia-south1.run.app"

echo "=== Production Health Checks ==="

check() {
  local name="$1"
  local url="$2"
  local result
  result=$(curl -sf --max-time 15 "$url" 2>&1) && status="PASS" || status="FAIL"
  echo "  [$status] $name — $url"
  if [ "$status" = "PASS" ]; then echo "         $result" | python3 -c "import sys,json; d=json.load(sys.stdin); print('        ',d)" 2>/dev/null || true; fi
}

check "backend /health"     "$BACKEND/health"
check "ai /health"          "$AI/health"
check "ai /model/health"    "$AI/model/health"
check "ai /redis/health"    "$AI/redis/health"
check "ai /db/health"       "$AI/db/health"

echo ""
echo "=== Parity Test (production AI engine) ==="
AI_ENGINE_URL="$AI" python3 "$(dirname "$0")/parity_test.py"

echo ""
echo "=== Production Smoke Test ==="
BASE_URL="$BACKEND/api/v1" AI_URL="$AI" python3 "$(dirname "$0")/smoke_test.py"
