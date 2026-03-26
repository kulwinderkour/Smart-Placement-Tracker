#!/bin/bash

echo "🔧 Fixing Roadmap Schema Issues..."

# Step 1: Reset database to clean state
echo "📦 Step 1: Resetting PostgreSQL database..."
docker compose exec postgres psql -U postgres -d placement_tracker -c "DROP TABLE IF EXISTS roadmaps;"

# Step 2: Apply fresh migrations
echo "🔄 Step 2: Applying Alembic migrations..."
docker compose exec backend-api alembic upgrade head

# Step 3: Verify the schema
echo "🔍 Step 3: Verifying roadmaps table schema..."
docker compose exec postgres psql -U postgres -d placement_tracker -c "\d roadmaps"

# Step 4: Test database connection from backend
echo "🧪 Step 4: Testing backend database connection..."
docker compose restart backend-api
sleep 5

# Step 5: Check backend logs
echo "📋 Step 5: Checking backend logs..."
docker compose logs --tail=20 backend-api

echo "✅ Schema fix complete!"
echo ""
echo "🔍 To verify manually:"
echo "   docker compose exec postgres psql -U postgres -d placement_tracker"
echo "   \d roadmaps"
echo "   \q"
