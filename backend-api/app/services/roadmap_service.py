import json
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, select
from app.models.roadmap import Roadmap
from app.schemas.roadmap import RoadmapRequest, RoadmapData
from app.config import settings
from typing import Optional, Dict, Any, List


class RoadmapService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_existing_roadmap(self, user_id: str, role: str, skills: list) -> Optional[Roadmap]:
        """Check if roadmap exists for exact combination of user_id + role + skills"""
        skills_json = json.dumps(sorted(skills))  # Sort to ensure consistent comparison
        
        result = await self.db.execute(
            select(Roadmap).where(
                and_(
                    Roadmap.user_id == user_id,
                    Roadmap.role == role,
                    Roadmap.skills == skills_json
                )
            )
        )
        
        return result.scalar_one_or_none()

    async def generate_roadmap_with_gemini(self, role: str, skills: list) -> Dict[str, Any]:
        """Generate roadmap using Gemini API"""
        
        prompt = f"""Generate a personalized job preparation roadmap for someone targeting {role} roles with these skills: {', '.join(skills)}.

Create a week-by-week roadmap (12-16 weeks total) that helps them prepare for {role} roles. 

For each week, provide:
1. Week number
2. Clear title (e.g., "Week 1: Master DSA Fundamentals")
3. Brief description
4. 3-4 specific topics to cover
5. 2-3 recommended resources (online courses, platforms, or specific content)
6. Difficulty level (beginner/intermediate/advanced)

Make it progressive, starting from their current level and building up to job-ready skills. Focus on practical, interview-relevant content.

Respond in this exact JSON format:
{{
  "title": "Roadmap title",
  "description": "Brief description",
  "totalWeeks": 12,
  "weeks": [
    {{
      "week": 1,
      "title": "Week 1: Title",
      "description": "Description",
      "topics": ["topic1", "topic2", "topic3"],
      "resources": ["resource1", "resource2"],
      "difficulty": "beginner"
    }}
  ]
}}"""

        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY not configured")

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                json={
                    "contents": [{"parts": [{"text": prompt}]}]
                },
                timeout=30.0
            )
            
            if response.status_code != 200:
                raise Exception(f"Gemini API error: {response.status_code} - {response.text}")
            
            result = response.json()
            
            if not result.get("candidates") or not result["candidates"][0].get("content", {}).get("parts"):
                raise Exception("Invalid response from Gemini API")
            
            text = result["candidates"][0]["content"]["parts"][0]["text"]
            
            # Extract JSON from response
            import re
            json_match = re.search(r'\{[\s\S]*\}', text)
            if not json_match:
                raise Exception("Could not parse JSON from Gemini response")
            
            roadmap_data = json.loads(json_match.group())
            return roadmap_data

    async def create_or_get_roadmap(self, user_id: str, request: RoadmapRequest) -> Roadmap:
        """Get existing roadmap or generate new one"""
        
        # Check if roadmap already exists
        existing = await self.get_existing_roadmap(user_id, request.role, request.skills)
        if existing:
            return existing
        
        # Generate new roadmap
        roadmap_data = await self.generate_roadmap_with_gemini(request.role, request.skills)
        
        # Save to database
        new_roadmap = Roadmap(
            user_id=user_id,
            role=request.role,
            skills=json.dumps(sorted(request.skills)),  # Sort for consistency
            roadmap_data=roadmap_data
        )
        
        self.db.add(new_roadmap)
        await self.db.commit()
        await self.db.refresh(new_roadmap)
        
        return new_roadmap

    async def get_user_roadmaps(self, user_id: str) -> List[Roadmap]:
        """Get all roadmaps for a user"""
        result = await self.db.execute(
            select(Roadmap).where(Roadmap.user_id == user_id).order_by(Roadmap.created_at.desc())
        )
        return result.scalars().all()
