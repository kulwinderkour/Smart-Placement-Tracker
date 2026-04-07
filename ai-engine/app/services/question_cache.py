"""
Cache-aside service for AI-generated interview questions.

Flow:
  1. Build a deterministic question_key from request fields.
  2. Check Redis  → REDIS HIT    → return cached payload.
  3. Check Postgres → POSTGRES HIT → backfill Redis → return payload.
  4. Call Gemini AI  → AI GENERATED → persist to Postgres → cache in Redis → return.
"""
import hashlib
import json
import logging

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.redis_cache import cache_get, cache_set, QUESTIONS_TTL

logger = logging.getLogger(__name__)

REDIS_PREFIX = "questions:"


# ---------------------------------------------------------------------------
# Key builder
# ---------------------------------------------------------------------------

def build_question_key(
    job_title: str,
    skills: list[str],
    difficulty: str,
    question_type: str,
    num_questions: int,
) -> str:
    """
    Produce a stable SHA-256 key so the same logical request always maps
    to the same cache entry regardless of skill ordering or whitespace.
    """
    role = job_title.strip().lower().replace(" ", "-")
    normalized_skills = sorted(s.strip().lower().replace(" ", "-") for s in skills)
    skills_str = ",".join(normalized_skills)
    diff = difficulty.strip().lower()
    qtype = question_type.strip().lower()
    raw = f"{role}:{skills_str}:{diff}:{qtype}:{num_questions}"
    return hashlib.sha256(raw.encode()).hexdigest()


# ---------------------------------------------------------------------------
# Postgres helpers (raw SQL — no ORM model needed in the ai-engine)
# ---------------------------------------------------------------------------

async def _pg_get(db: AsyncSession, question_key: str) -> dict | None:
    result = await db.execute(
        text("SELECT payload FROM generated_questions WHERE question_key = :key"),
        {"key": question_key},
    )
    row = result.fetchone()
    if row is None:
        return None
    payload = row[0]
    return payload if isinstance(payload, dict) else json.loads(payload)


async def _pg_save(
    db: AsyncSession,
    question_key: str,
    payload: dict,
    job_title: str,
    difficulty: str,
    question_type: str,
    num_questions: int,
) -> None:
    await db.execute(
        text("""
            INSERT INTO generated_questions
                (question_key, role, topic, difficulty, question_type, question_count, payload)
            VALUES
                (:key, :role, :topic, :difficulty, :qtype, :count, CAST(:payload AS JSONB))
            ON CONFLICT (question_key) DO NOTHING
        """),
        {
            "key": question_key,
            "role": job_title,
            "topic": job_title,
            "difficulty": difficulty,
            "qtype": question_type,
            "count": num_questions,
            "payload": json.dumps(payload),
        },
    )
    await db.commit()


# ---------------------------------------------------------------------------
# Public cache-aside entrypoint
# ---------------------------------------------------------------------------

async def get_or_generate_questions(
    *,
    job_title: str,
    skills: list[str],
    difficulty: str,
    question_type: str,
    num_questions: int,
    db: AsyncSession,
    generator,          # async callable: (job_title, skills, difficulty, num_questions, question_type) -> dict
) -> tuple[dict, str]:
    """
    Returns (payload_dict, source) where source is one of:
      "REDIS HIT", "POSTGRES HIT", "AI GENERATED"
    """
    question_key = build_question_key(job_title, skills, difficulty, question_type, num_questions)
    redis_key = f"{REDIS_PREFIX}{question_key}"

    # --- 1. Redis ---
    cached = await cache_get(redis_key)
    if cached is not None:
        logger.info("REDIS HIT  [key=%s]", question_key[:12])
        return cached, "REDIS HIT"

    # --- 2. Postgres ---
    try:
        stored = await _pg_get(db, question_key)
    except Exception as exc:
        logger.warning("Postgres GET failed (will regenerate): %s", exc)
        stored = None
    if stored is not None:
        logger.info("POSTGRES HIT  [key=%s]", question_key[:12])
        await cache_set(redis_key, stored, ttl=QUESTIONS_TTL)
        return stored, "POSTGRES HIT"

    # --- 3. AI generation ---
    logger.info("AI GENERATED  [key=%s]  role=%s  diff=%s  type=%s  count=%d",
                question_key[:12], job_title, difficulty, question_type, num_questions)
    payload = await generator(
        job_title=job_title,
        job_description="",
        skills=skills,
        difficulty=difficulty,
        num_questions=num_questions,
        question_type=question_type,
    )

    # Persist + cache (failures are non-fatal)
    try:
        await _pg_save(db, question_key, payload, job_title, difficulty, question_type, num_questions)
    except Exception as exc:
        logger.warning("Postgres save failed: %s", exc)

    try:
        await cache_set(redis_key, payload, ttl=QUESTIONS_TTL)
    except Exception as exc:
        logger.warning("Redis set failed: %s", exc)

    return payload, "AI GENERATED"
