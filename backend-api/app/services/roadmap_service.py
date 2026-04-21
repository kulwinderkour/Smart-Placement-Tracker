import json
import re
import logging
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, select
from app.models.roadmap import Roadmap
from app.models.generated_roadmap import GeneratedRoadmap
from app.schemas.roadmap import RoadmapRequest
from app.services.redis_cache import cache_get, cache_set
from app.config import settings
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

CACHE_PREFIX = "roadmap:"


def build_roadmap_key(role: str, skills: list, level: str = "", duration_weeks: int = 0) -> str:
    """Build a normalized, deterministic cache key from request parameters.

    Same role + same level + same duration + same sorted skills = same key.
    """
    norm_role = role.strip().lower().replace(" ", "-")
    norm_level = level.strip().lower().replace(" ", "-") if level else "any"
    norm_duration = str(duration_weeks) if duration_weeks else "0"
    norm_skills = "-".join(sorted(s.strip().lower().replace(" ", "-") for s in skills))
    key = f"{norm_role}:{norm_level}:{norm_duration}:{norm_skills}"
    return f"{CACHE_PREFIX}{key}"


class RoadmapService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ──────────────────────────────────────────────────────────────
    # Internal helpers
    # ──────────────────────────────────────────────────────────────

    async def _get_user_roadmap(self, user_id: str, role: str, skills: list) -> Optional[Roadmap]:
        """Return the user-specific Roadmap row if it exists."""
        skills_json = json.dumps(sorted(skills))
        result = await self.db.execute(
            select(Roadmap).where(
                and_(
                    Roadmap.user_id == user_id,
                    Roadmap.role == role,
                    Roadmap.skills == skills_json,
                )
            ).limit(1)
        )
        return result.scalars().first()

    async def _get_generated_roadmap(self, roadmap_key: str) -> Optional[GeneratedRoadmap]:
        """Return a shared GeneratedRoadmap row by its key."""
        result = await self.db.execute(
            select(GeneratedRoadmap).where(GeneratedRoadmap.roadmap_key == roadmap_key)
        )
        return result.scalar_one_or_none()

    async def _save_generated_roadmap(
        self,
        roadmap_key: str,
        role: str,
        payload: Dict[str, Any],
        level: str = "",
        duration_weeks: int = 0,
        source_prompt: str = "",
    ) -> GeneratedRoadmap:
        """Persist a newly generated roadmap to generated_roadmaps (INSERT … ON CONFLICT IGNORE)."""
        row = GeneratedRoadmap(
            roadmap_key=roadmap_key,
            title=payload.get("title", role),
            role=role,
            level=level or None,
            duration_weeks=duration_weeks or None,
            source_prompt=source_prompt or None,
            payload=payload,
        )
        self.db.add(row)
        try:
            await self.db.flush()
        except Exception:
            await self.db.rollback()
            logger.warning("generated_roadmaps INSERT conflict – fetching existing row")
            existing = await self._get_generated_roadmap(roadmap_key)
            if existing:
                return existing
            raise
        return row

    async def _save_user_roadmap(
        self, user_id: str, role: str, skills: list, payload: Dict[str, Any]
    ) -> Roadmap:
        """Create a user-specific Roadmap record from the shared payload."""
        roadmap = Roadmap(
            user_id=user_id,
            field=payload.get("field", role),
            title=payload.get("title", role),
            description=payload.get("description", ""),
            role=role,
            skills=json.dumps(sorted(skills)),
            roadmap_data=payload,
        )
        self.db.add(roadmap)
        await self.db.commit()
        await self.db.refresh(roadmap)
        return roadmap

    # ──────────────────────────────────────────────────────────────
    # Gemini API call
    # ──────────────────────────────────────────────────────────────

    async def _call_gemini(self, role: str, skills: list) -> Dict[str, Any]:
        """Call Gemini API and return parsed roadmap JSON."""
        skill_text = ", ".join(skills) if skills else "general programming"
        prompt = f"""Generate a personalized job preparation roadmap for someone targeting {role} roles with these skills: {skill_text}.

Create a week-by-week roadmap (12-16 weeks total) that helps them prepare for {role} roles.

For each week, provide:
1. Week number
2. Clear title (e.g., "Week 1: Master DSA Fundamentals")
3. Brief description
4. 3-4 specific topics to cover
5. 2-3 recommended resources (online courses, platforms, or specific content)
6. Difficulty level (beginner/intermediate/advanced)

Make it progressive, starting from their current level and building up to job-ready skills.

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

        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"gemini-2.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
        )

        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                json={"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"temperature": 0.7}},
                timeout=90.0,
            )

        if response.status_code != 200:
            raise Exception(f"Gemini API error: {response.status_code} - {response.text}")

        result = response.json()
        candidates = result.get("candidates", [])
        if not candidates:
            raise Exception("No candidates in Gemini response")

        parts = candidates[0].get("content", {}).get("parts", [])
        text = next((p["text"] for p in parts if p.get("text")), None)
        if not text:
            raise Exception(f"No text in Gemini response parts: {parts}")

        match = re.search(r'\{[\s\S]*\}', text)
        if not match:
            raise Exception("Could not parse JSON from Gemini response")

        return json.loads(match.group())

    # ──────────────────────────────────────────────────────────────
    # Public API – cache-aside entry point
    # ──────────────────────────────────────────────────────────────

    async def create_or_get_roadmap(self, user_id: str, request: RoadmapRequest) -> Roadmap:
        """Return an existing or newly generated roadmap for the user.

        Flow:
        1. Return the user's own Roadmap row if it already exists (fastest path).
        2. Build roadmap_key → check Redis cache.
        3. On Redis miss → check generated_roadmaps (Postgres).
        4. On Postgres miss → call Gemini, persist to generated_roadmaps, cache in Redis.
        5. Create and return a user-specific Roadmap row from the resolved payload.
        """
        # ── 1. Check user-specific roadmap ──────────────────────────
        existing_user_roadmap = await self._get_user_roadmap(user_id, request.role, request.skills)
        if existing_user_roadmap:
            logger.info("Roadmap HIT (user table) for user=%s role=%s", user_id, request.role)
            return existing_user_roadmap

        roadmap_key = build_roadmap_key(request.role, request.skills)
        payload: Optional[Dict[str, Any]] = None

        # ── 2. Check Redis cache ─────────────────────────────────────
        cached = await cache_get(roadmap_key)
        if cached:
            logger.info("Roadmap HIT (Redis) key=%s", roadmap_key)
            payload = cached
        else:
            # ── 3. Check generated_roadmaps (Postgres) ───────────────
            gen_row = await self._get_generated_roadmap(roadmap_key)
            if gen_row:
                logger.info("Roadmap HIT (generated_roadmaps) key=%s", roadmap_key)
                payload = gen_row.payload
                await cache_set(roadmap_key, payload)
                logger.info("Roadmap re-cached in Redis key=%s", roadmap_key)
            else:
                # ── 4. Call Gemini ────────────────────────────────────
                logger.info("Roadmap MISS – calling Gemini for role=%s", request.role)
                payload = await self._call_gemini(request.role, request.skills)

                await self._save_generated_roadmap(roadmap_key, request.role, payload)
                await self.db.commit()
                logger.info("Roadmap persisted to generated_roadmaps key=%s", roadmap_key)

                await cache_set(roadmap_key, payload)
                logger.info("Roadmap cached in Redis key=%s", roadmap_key)

        # ── 5. Create user-specific Roadmap row ──────────────────────
        return await self._save_user_roadmap(user_id, request.role, request.skills, payload)

    async def get_user_roadmaps(self, user_id: str) -> List[Roadmap]:
        """Return all roadmaps for a user, newest first."""
        result = await self.db.execute(
            select(Roadmap).where(Roadmap.user_id == user_id).order_by(Roadmap.created_at.desc())
        )
        return result.scalars().all()
