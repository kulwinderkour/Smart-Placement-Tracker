#!/bin/bash

echo "🔍 Verifying Roadmap Schema Fix..."

# 1. Check if field column exists
echo "✅ Checking if 'field' column exists in roadmaps table..."
docker compose exec postgres psql -U postgres -d placement_tracker -c "\d roadmaps" | grep field

# 2. Test backend connection
echo "🧪 Testing backend database connection..."
docker compose exec backend-api python -c "
import asyncio
from sqlalchemy import text
from app.database import get_db_session

async def test():
    async with get_db_session() as db:
        result = await db.execute(text('SELECT field FROM roadmaps LIMIT 1'))
        print('✅ Field column accessible!')
        print(f'📊 Sample field: {result.scalar()}')

asyncio.run(test())
"

# 3. Check backend logs for errors
echo "📋 Checking recent backend logs..."
docker compose logs --tail=10 backend-api | grep -E "(Database connection failed|column.*does not exist|Falling back to Redis)" || echo "✅ No database errors found!"

# 4. Test roadmap endpoint
echo "🌐 Testing roadmap endpoint..."
curl -s http://localhost:8000/api/v1/roadmap/topics || echo "⚠️  Endpoint test failed"

echo ""
echo "🎉 Verification complete!"
echo ""
echo "📊 Expected results:"
echo "   ✅ Field column should exist in roadmaps table"
echo "   ✅ Backend should connect to database successfully"
echo "   ✅ No 'column field does not exist' errors"
echo "   ✅ Backend should NOT fall back to Redis-only mode"
