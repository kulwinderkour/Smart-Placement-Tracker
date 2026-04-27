#!/bin/bash
# Switch between local and cloud database

set -e

MODE=$1

if [ "$MODE" != "local" ] && [ "$MODE" != "cloud" ]; then
    echo "Usage: ./switch-db.sh [local|cloud]"
    echo ""
    echo "Examples:"
    echo "  ./switch-db.sh local   # Switch to local PostgreSQL"
    echo "  ./switch-db.sh cloud   # Switch to Google Cloud SQL"
    exit 1
fi

if [ "$MODE" == "local" ]; then
    echo "🔄 Switching to LOCAL database..."
    cp .env.local .env
    cp backend-api/.env.local backend-api/.env 2>/dev/null || echo "backend-api/.env.local not found"
    cp ai-engine/.env.local ai-engine/.env 2>/dev/null || echo "ai-engine/.env.local not found"
    echo "✅ Now using LOCAL database (localhost:5432)"
    echo ""
    echo "Make sure your local PostgreSQL is running:"
    echo "  docker-compose up postgres -d"
    
elif [ "$MODE" == "cloud" ]; then
    echo "🔄 Switching to CLOUD database via cloud-sql-proxy..."
    cp .env.cloud .env
    cp backend-api/.env.cloud backend-api/.env 2>/dev/null || echo "backend-api/.env.cloud not found"
    cp ai-engine/.env.cloud ai-engine/.env 2>/dev/null || echo "ai-engine/.env.cloud not found"

    # Start cloud-sql-proxy if not already running
    if ! lsof -i :5433 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "▶  Starting cloud-sql-proxy on 0.0.0.0:5433..."
        GOOGLE_APPLICATION_CREDENTIALS=~/secrets/smart-placement/backend-api-sa-key.json \
        "$(dirname "$0")/cloud-sql-proxy" \
            --address 0.0.0.0 \
            --port 5433 \
            smart-placement-prod:asia-south1:smart-placement-db \
            > /tmp/cloud-sql-proxy.log 2>&1 &
        sleep 3
        echo "   Proxy log: /tmp/cloud-sql-proxy.log"
    else
        echo "✓  cloud-sql-proxy already running on :5433"
    fi

    echo "✅ Now using CLOUD database via proxy (192.168.65.254:5433)"
    echo ""
    echo "⚠️  Remember: You're now connected to the shared team database!"
    echo "   All changes will be visible to your teammates."
fi

echo ""
echo "Restart your services to apply changes:"
echo "  cd backend-api && uvicorn app.main:app --reload --port 8000"
echo "  cd ai-engine && uvicorn app.main:app --reload --port 8002"
