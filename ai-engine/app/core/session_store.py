"""
session_store.py
----------------
Redis-backed session memory for the Smart Placement Agent.

Key design
~~~~~~~~~~
Keys are keyed by a *stable student ID* — never the raw JWT token, which
rotates on every login and would silently lose memory.

Stable ID resolution (in priority order):
  1. student_profile["id"]           — backend UUID / int
  2. student_profile["student_id"]   — alternate field name
  3. student_profile["userId"]       — camelCase variant
  4. SHA-256(student_token)[:16]     — last-resort fallback

Redis key schema
~~~~~~~~~~~~~~~~
  agent:session:<stable_id>:search        → {jobs, filters, saved_at}
  agent:session:<stable_id>:pending       → {jobs, filters, action, created_at, expires_at}
  agent:session:<stable_id>:history       → [{role, content, metadata, ts}, ...] max 10 turns
  agent:session:<stable_id>:applications  → [{job_id, status, application_id, reason, match_score, ts, ...}]
  agent:session:<stable_id>:traces        → [{step, status, detail, ts}, ...] last 100
  agent:session:<stable_id>:context       → {last_intent, last_action, ...}
  agent:session:<stable_id>:resume_meta   → {resume_hash, resume_version, uploaded_at, parsed_at,
                                              confirmed_skills, versions: [{...}, ...]}

TTL: 30 minutes for search/pending, 24 hours for history,
     30 days for applications, 7 days for traces,
     90 days for resume_meta.

Fallback
~~~~~~~~
If Redis is unreachable the store silently degrades to an in-process dict.
Data is lost on restart, but the agent remains functional.
"""

from __future__ import annotations

import hashlib
import json
import logging
import time
from typing import Any

logger = logging.getLogger(__name__)

_SESSION_TTL       = 1800      # 30 minutes — search / pending
_HISTORY_TTL       = 86400     # 24 hours   — conversation history
_APPLICATIONS_TTL  = 2592000   # 30 days    — full application memory
_TRACES_TTL        = 604800    # 7 days     — execution traces
_RESUME_META_TTL   = 7776000   # 90 days    — resume hash + version history
_HISTORY_MAX       = 10        # maximum turns kept
_TRACES_MAX        = 100       # maximum traces kept
_RESUME_VERSIONS_MAX = 10      # keep last 10 resume versions

# ── In-process fallback store ──────────────────────────────────────────────────
_local_store: dict[str, Any] = {}


# ── Stable ID resolution ───────────────────────────────────────────────────────

def _stable_id(student_token: str, student_profile: dict | None = None) -> str:
    """
    Return a stable, non-rotating identifier for the student.

    Prefers a real profile ID so that memory survives JWT rotation.
    Falls back to a token hash when no profile ID is available.
    """
    if student_profile:
        for field in ("id", "student_id", "userId"):
            val = student_profile.get(field)
            if val is not None:
                return str(val)
    # Last-resort: hash the token (stable within a single JWT lifetime)
    return hashlib.sha256(student_token.encode()).hexdigest()[:16]


def _key(sid: str, field: str) -> str:
    return f"agent:session:{sid}:{field}"


# ── Redis client (lazy, singleton) ────────────────────────────────────────────

_redis_client = None
_redis_available: bool | None = None  # None = not yet checked


async def _get_redis():
    global _redis_client, _redis_available
    if _redis_available is False:
        return None
    if _redis_client is not None:
        return _redis_client
    try:
        import redis.asyncio as aioredis
        from app.config import settings

        url = settings.REDIS_URL
        client = aioredis.from_url(url, decode_responses=True, socket_connect_timeout=2)
        await client.ping()
        _redis_client = client
        _redis_available = True
        logger.info("[SessionStore] Redis connected at %s", url)
        return _redis_client
    except Exception as e:
        _redis_available = False
        logger.warning("[SessionStore] Redis unavailable (%s) — using in-process fallback", e)
        return None


# ── Internal Redis helpers ────────────────────────────────────────────────────

async def _rset(k: str, payload: str, ttl: int = _SESSION_TTL) -> None:
    redis = await _get_redis()
    if redis:
        try:
            await redis.setex(k, ttl, payload)
            return
        except Exception as e:
            logger.warning("[SessionStore] write failed for %s: %s", k, e)
    _local_store[k] = json.loads(payload)


async def _rget(k: str) -> Any | None:
    redis = await _get_redis()
    if redis:
        try:
            raw = await redis.get(k)
            return json.loads(raw) if raw else None
        except Exception as e:
            logger.warning("[SessionStore] read failed for %s: %s", k, e)
    return _local_store.get(k)


async def _rdel(*keys: str) -> None:
    redis = await _get_redis()
    if redis:
        try:
            await redis.delete(*keys)
            return
        except Exception as e:
            logger.warning("[SessionStore] delete failed: %s", e)
    for k in keys:
        _local_store.pop(k, None)


# ── Search cache API ──────────────────────────────────────────────────────────

async def save_search(
    student_token: str,
    jobs: list[dict],
    filters: dict,
    student_profile: dict | None = None,
) -> None:
    """Persist filtered job list + filters. Keyed by stable student ID."""
    sid = _stable_id(student_token, student_profile)
    payload = json.dumps({"jobs": jobs, "filters": filters, "saved_at": int(time.time())})
    await _rset(_key(sid, "search"), payload, ttl=_SESSION_TTL)
    logger.debug("[SessionStore] Saved %d jobs for sid=%s", len(jobs), sid)


async def load_search(
    student_token: str,
    student_profile: dict | None = None,
) -> tuple[list[dict] | None, dict | None]:
    """Return (cached_jobs, cached_filters) or (None, None) on miss."""
    sid = _stable_id(student_token, student_profile)
    data = await _rget(_key(sid, "search"))
    if data:
        jobs = data.get("jobs") or []
        filters = data.get("filters") or {}
        logger.debug("[SessionStore] Search hit: %d jobs for sid=%s", len(jobs), sid)
        return jobs, filters
    return None, None


async def clear_search(
    student_token: str,
    student_profile: dict | None = None,
) -> None:
    """Invalidate search cache after a successful apply run."""
    sid = _stable_id(student_token, student_profile)
    await _rdel(_key(sid, "search"))


# ── Pending-confirmation API ──────────────────────────────────────────────────

async def save_pending(
    student_token: str,
    jobs: list[dict],
    filters: dict,
    action: str = "apply_jobs",
    student_profile: dict | None = None,
) -> None:
    """
    Save a pending confirmation state server-side.

    Stores expires_at so load_pending can reject stale entries
    even if Redis TTL has not yet elapsed.
    """
    now = int(time.time())
    sid = _stable_id(student_token, student_profile)
    payload = json.dumps({
        "pending_confirmation": True,
        "jobs": jobs,
        "filters": filters,
        "action": action,
        "created_at": now,
        "expires_at": now + _SESSION_TTL,
    })
    await _rset(_key(sid, "pending"), payload, ttl=_SESSION_TTL)
    logger.info("[SessionStore] Saved pending confirmation: %d jobs, action=%s, sid=%s",
                len(jobs), action, sid)


async def load_pending(
    student_token: str,
    student_profile: dict | None = None,
    expected_action: str = "apply_jobs",
) -> dict | None:
    """
    Return valid pending state or None.

    Validates:
      - pending_confirmation flag is True
      - expires_at has not passed
      - action matches expected_action

    Returns None (and logs reason) on any validation failure.
    """
    sid = _stable_id(student_token, student_profile)
    data = await _rget(_key(sid, "pending"))
    if not data:
        return None
    if not data.get("pending_confirmation"):
        logger.debug("[SessionStore] Pending flag not set for sid=%s", sid)
        return None
    if int(time.time()) > data.get("expires_at", 0):
        logger.info("[SessionStore] Pending expired for sid=%s — clearing", sid)
        await _rdel(_key(sid, "pending"))
        return None
    if data.get("action") != expected_action:
        logger.warning(
            "[SessionStore] Pending action mismatch: stored=%s expected=%s sid=%s",
            data.get("action"), expected_action, sid,
        )
        return None
    logger.info("[SessionStore] Pending valid: %d jobs, action=%s, sid=%s",
                len(data.get("jobs", [])), data.get("action"), sid)
    return data


async def clear_pending(
    student_token: str,
    student_profile: dict | None = None,
) -> None:
    """Clear pending confirmation — called on yes (after apply) or cancel."""
    sid = _stable_id(student_token, student_profile)
    await _rdel(_key(sid, "pending"))
    logger.debug("[SessionStore] Cleared pending for sid=%s", sid)


# ── Conversation history API ───────────────────────────────────────────────────

async def append_history(
    student_token: str,
    user_message: str,
    agent_reply: str,
    intent: str = "",
    student_profile: dict | None = None,
    metadata: dict | None = None,
) -> None:
    """
    Append one exchange (user + agent) to the conversation history.

    Each agent entry includes structured metadata alongside the text reply:
      {
        "intent":           str,
        "tool_used":        str,
        "filters_used":     dict,
        "jobs_count":       int,
        "execution_status": str,   # "success" | "failed" | "awaiting_confirmation"
        "timestamp":        int,
      }

    Keeps at most _HISTORY_MAX turns (oldest dropped first).
    TTL is 24 hours — longer than session TTL so context persists across logins.
    """
    sid = _stable_id(student_token, student_profile)
    k = _key(sid, "history")
    history: list[dict] = (await _rget(k)) or []

    now = int(time.time())
    structured_meta = {
        "intent":           intent,
        "tool_used":        (metadata or {}).get("tool_used", ""),
        "filters_used":     (metadata or {}).get("filters_used", {}),
        "jobs_count":       (metadata or {}).get("jobs_count", 0),
        "execution_status": (metadata or {}).get("execution_status", "success"),
        "timestamp":        now,
    }
    history.append({"role": "user",  "content": user_message, "ts": now})
    history.append({
        "role":     "agent",
        "content":  agent_reply,
        "ts":       now,
        "metadata": structured_meta,
    })

    # Trim to last _HISTORY_MAX turns (each turn = 2 entries)
    max_entries = _HISTORY_MAX * 2
    if len(history) > max_entries:
        history = history[-max_entries:]

    await _rset(k, json.dumps(history), ttl=_HISTORY_TTL)
    logger.debug("[SessionStore] History appended (%d entries) for sid=%s", len(history), sid)


async def load_history(
    student_token: str,
    student_profile: dict | None = None,
) -> list[dict]:
    """
    Return the conversation history list.

    Each entry: {role: 'user'|'agent', content: str, ts: int}
    Returns [] if no history.
    """
    sid = _stable_id(student_token, student_profile)
    return (await _rget(_key(sid, "history"))) or []


async def clear_history(
    student_token: str,
    student_profile: dict | None = None,
) -> None:
    """Wipe conversation history (e.g. on logout or explicit reset)."""
    sid = _stable_id(student_token, student_profile)
    await _rdel(_key(sid, "history"))


# ── Full application memory API ────────────────────────────────────────────────

async def record_applied_jobs(
    student_token: str,
    applications: list[dict],
    student_profile: dict | None = None,
) -> None:
    """
    Record full application state for every job attempted.

    Each entry must have at least {"job_id": ...}. All fields are optional
    but the more provided, the richer Gemini's memory answers.

    Canonical shape:
      {
        "job_id":         str,
        "status":         "applied" | "failed" | "skipped" | "duplicate",
        "application_id": str,
        "reason":         str,   # e.g. "score_low", "validation_failed", "duplicate"
        "match_score":    float,
        "job_title":      str,
        "company":        str,
        "salary_lpa":     float,
        "timestamp":      int,
      }

    Dedup: job_id-level. Re-recording an existing job_id updates its entry
    (so a later manual apply can update a previous "failed" entry).
    TTL: 30 days.
    """
    if not applications:
        return
    sid = _stable_id(student_token, student_profile)
    k = _key(sid, "applications")
    existing: list[dict] = (await _rget(k)) or []

    now = int(time.time())
    existing_map: dict[str, int] = {str(e["job_id"]): i for i, e in enumerate(existing)}
    for app in applications:
        jid = str(app.get("job_id", ""))
        if not jid:
            continue
        entry = {
            "job_id":         jid,
            "status":         str(app.get("status") or "applied"),
            "application_id": str(app.get("application_id") or ""),
            "reason":         str(app.get("reason") or ""),
            "match_score":    float(app.get("match_score") or 0.0),
            "job_title":      str(app.get("job_title") or app.get("title") or ""),
            "company":        str(app.get("company") or ""),
            "salary_lpa":     float(app.get("salary_lpa") or app.get("salary_max_lpa") or 0.0),
            "timestamp":      now,
        }
        if jid in existing_map:
            existing[existing_map[jid]] = entry   # update in-place
        else:
            existing.append(entry)
            existing_map[jid] = len(existing) - 1

    await _rset(k, json.dumps(existing), ttl=_APPLICATIONS_TTL)
    logger.info("[SessionStore] Recorded %d application(s) (total=%d) for sid=%s",
                len(applications), len(existing), sid)


async def load_applications(
    student_token: str,
    student_profile: dict | None = None,
) -> list[dict]:
    """Return full application history list. Returns [] if none."""
    sid = _stable_id(student_token, student_profile)
    return (await _rget(_key(sid, "applications"))) or []


async def load_applied_job_ids(
    student_token: str,
    student_profile: dict | None = None,
) -> set[str]:
    """
    Return the set of job_id strings where status == 'applied'.
    Used for dedup checks before submitting.
    """
    apps = await load_applications(student_token, student_profile)
    return {a["job_id"] for a in apps if a.get("status") == "applied"}


async def filter_unapplied_jobs(
    student_token: str,
    jobs: list[dict],
    student_profile: dict | None = None,
) -> tuple[list[dict], list[dict]]:
    """
    Split jobs into (unapplied, duplicates).

    Only jobs with status == 'applied' count as duplicates.
    Failed/skipped jobs are NOT blocked — the student may want to retry.
    """
    applied_ids = await load_applied_job_ids(student_token, student_profile)
    unapplied, duplicates = [], []
    for job in jobs:
        jid = str(job.get("id") or job.get("job_id") or "")
        if jid and jid in applied_ids:
            duplicates.append(job)
            logger.info("[SessionStore] Duplicate skip: job_id=%s already applied", jid)
        else:
            unapplied.append(job)
    return unapplied, duplicates


# ── Execution traces API ─────────────────────────────────────────────────────

async def append_trace(
    student_token: str,
    step: str,
    status: str,
    detail: str = "",
    student_profile: dict | None = None,
) -> None:
    """
    Append one pipeline step trace.

    step   — e.g. "intent_parse", "job_fetch", "validation",
               "prediction", "apply_submit", "dedupe_check", "confirmation_check"
    status — "success" | "failed" | "skipped"
    detail — optional short reason / value string

    Keeps at most _TRACES_MAX entries (oldest dropped first). TTL: 7 days.
    """
    sid = _stable_id(student_token, student_profile)
    k = _key(sid, "traces")
    traces: list[dict] = (await _rget(k)) or []
    traces.append({"step": step, "status": status, "detail": detail[:200],
                   "ts": int(time.time())})
    if len(traces) > _TRACES_MAX:
        traces = traces[-_TRACES_MAX:]
    await _rset(k, json.dumps(traces), ttl=_TRACES_TTL)
    logger.debug("[SessionStore] Trace: %s=%s for sid=%s", step, status, sid)


async def load_traces(
    student_token: str,
    student_profile: dict | None = None,
    last_n: int = 50,
) -> list[dict]:
    """Return the most recent `last_n` trace entries. Returns [] if none."""
    sid = _stable_id(student_token, student_profile)
    traces: list[dict] = (await _rget(_key(sid, "traces"))) or []
    return traces[-last_n:] if traces else []


# ── Context API (generic key-value) ──────────────────────────────────────────────

async def save_context(
    student_token: str,
    context: dict,
    student_profile: dict | None = None,
) -> None:
    """Save arbitrary session context (last_intent, last_action, etc.)."""
    sid = _stable_id(student_token, student_profile)
    await _rset(_key(sid, "context"), json.dumps(context))


async def load_context(
    student_token: str,
    student_profile: dict | None = None,
) -> dict:
    """Load session context. Returns {} if not set."""
    sid = _stable_id(student_token, student_profile)
    return (await _rget(_key(sid, "context"))) or {}


# ── Resume meta API (hash dedup + versioning + confirmed_skills) ──────────────

# Canonical alias table: lowercase key → display form
_SKILL_ALIASES: dict[str, str] = {
    # JavaScript ecosystem
    "javascript":      "JavaScript",
    "js":              "JavaScript",
    "typescript":      "TypeScript",
    "ts":              "TypeScript",
    "node js":         "Node.js",
    "nodejs":          "Node.js",
    "node.js":         "Node.js",
    "reactjs":         "React",
    "react js":        "React",
    "react.js":        "React",
    "vuejs":           "Vue.js",
    "vue js":          "Vue.js",
    "angularjs":       "Angular",
    "angular js":      "Angular",
    "nextjs":          "Next.js",
    "next js":         "Next.js",
    "expressjs":       "Express.js",
    "express js":      "Express.js",
    # Python
    "pyhton":          "Python",
    "pyton":           "Python",
    "pythn":           "Python",
    "python3":         "Python",
    "python 3":        "Python",
    "django rest":     "Django REST",
    "djangorest":      "Django REST",
    # Java
    "java script":     "JavaScript",   # common OCR mistake
    "jvaa":            "Java",
    "jave":            "Java",
    "spring boot":     "Spring Boot",
    "springboot":      "Spring Boot",
    # Databases
    "postgresql":      "PostgreSQL",
    "postgres":        "PostgreSQL",
    "mysql":           "MySQL",
    "mongodb":         "MongoDB",
    "mongo db":        "MongoDB",
    "mongo":           "MongoDB",
    "redis db":        "Redis",
    "sqlite":          "SQLite",
    # Cloud / DevOps
    "aws cloud":       "AWS",
    "amazon web services": "AWS",
    "gcp":             "Google Cloud",
    "google cloud platform": "Google Cloud",
    "azure cloud":     "Azure",
    "microsoft azure": "Azure",
    "docker container": "Docker",
    "kubernetes":      "Kubernetes",
    "k8s":             "Kubernetes",
    "ci/cd":           "CI/CD",
    "cicd":            "CI/CD",
    # General
    "machine learning": "Machine Learning",
    "ml":              "Machine Learning",
    "deep learning":   "Deep Learning",
    "dl":              "Deep Learning",
    "artificial intelligence": "AI",
    "natural language processing": "NLP",
    "large language model": "LLM",
    "llms":            "LLM",
    "restful api":     "REST API",
    "rest apis":       "REST API",
    "graphql api":     "GraphQL",
    "git hub":         "Git",
    "github":          "GitHub",
    "gitlab":          "GitLab",
    "html5":           "HTML",
    "css3":            "CSS",
    "tailwindcss":     "TailwindCSS",
    "tailwind css":    "TailwindCSS",
    "c++":             "C++",
    "c plus plus":     "C++",
    "golang":          "Go",
    "go lang":         "Go",
    "rust lang":       "Rust",
}


_FUZZY_THRESHOLD = 90  # minimum rapidfuzz token_sort_ratio score to accept a match

# Canonical skill list used as the fuzzy match target (derived from alias values)
# Built once at import time; add new canonical forms here or via _SKILL_ALIASES values.
_CANONICAL_SKILLS: list[str] = sorted({v for v in _SKILL_ALIASES.values()})


def _normalize_skills(
    skills: list[str],
    return_audit: bool = False,
) -> list[str] | tuple[list[str], list[dict]]:
    """Normalize + deduplicate a raw skill list.

    Three-layer pipeline per skill:
      1. Strip / length guard (2–60 chars)
      2. Alias lookup  (exact lowercase match → canonical form)
      3. Fuzzy match   (rapidfuzz token_sort_ratio ≥ 90 against _CANONICAL_SKILLS)
         Falls back gracefully if rapidfuzz is not installed.

    Args:
        skills:       Raw skill strings from Gemini or resume parser.
        return_audit: If True, also return list of normalization mapping dicts
                      {"raw", "normalized", "method"} for audit/debugging.

    Returns:
        list[str]                         if return_audit=False (default)
        tuple[list[str], list[dict]]      if return_audit=True
    """
    try:
        from rapidfuzz import process as _fuzz_process, fuzz as _fuzz
        _fuzzy_available = True
    except ImportError:
        _fuzzy_available = False

    seen: dict[str, str] = {}     # lowercase_key → canonical display form
    audit: list[dict] = []

    for raw in skills:
        s = raw.strip()
        if len(s) < 2 or len(s) > 60:
            continue
        key = s.lower()

        # ── Layer 1: alias lookup ─────────────────────────────────────────────
        if key in _SKILL_ALIASES:
            canonical = _SKILL_ALIASES[key]
            method = "alias"

        # ── Layer 2: fuzzy match ──────────────────────────────────────────────
        elif _fuzzy_available and _CANONICAL_SKILLS:
            result = _fuzz_process.extractOne(
                s,
                _CANONICAL_SKILLS,
                scorer=_fuzz.token_sort_ratio,
                score_cutoff=_FUZZY_THRESHOLD,
            )
            if result is not None:
                canonical = result[0]
                method = "fuzzy"
            else:
                canonical = s
                method = "direct"

        # ── Layer 3: direct (no alias, no fuzzy) ──────────────────────────────
        else:
            canonical = s
            method = "direct"

        audit.append({"raw": raw, "normalized": canonical, "method": method})

        # Deduplicate by the canonical form's lowercase (not the raw input key)
        # so "nodejs" and "node.js" → "Node.js" both collapse to the same slot.
        canonical_key = canonical.lower()
        if canonical_key not in seen:
            seen[canonical_key] = canonical

    result_list = list(seen.values())
    if return_audit:
        return result_list, audit
    return result_list


async def load_resume_meta(
    student_token: str,
    student_profile: dict | None = None,
) -> dict:
    """Return stored resume metadata, or empty dict on miss.

    Schema:
      {
        "resume_hash":       "<sha256hex>",
        "resume_version":    <int>,
        "uploaded_at":       <unix_ts>,   # set externally from resume response
        "parsed_at":         <unix_ts>,
        "confirmed_skills":  ["React", ...],
        "versions": [
          {
            "version": <int>,
            "resume_hash": "<hex>",
            "parsed_at": <ts>,
            "skills_snapshot": [...],
            "confidence": <float>,
          },
          ...
        ]
      }
    """
    sid = _stable_id(student_token, student_profile)
    return (await _rget(_key(sid, "resume_meta"))) or {}


async def save_resume_meta(
    student_token: str,
    meta: dict,
    student_profile: dict | None = None,
) -> None:
    """Persist resume metadata. TTL: 90 days."""
    sid = _stable_id(student_token, student_profile)
    await _rset(_key(sid, "resume_meta"), json.dumps(meta), ttl=_RESUME_META_TTL)
    logger.debug("[SessionStore] resume_meta saved for sid=%s (v%s)", sid, meta.get("resume_version"))


async def append_resume_version(
    student_token: str,
    resume_hash: str,
    skills_snapshot: list[str],
    confidence: float,
    content_hash: str = "",
    student_profile: dict | None = None,
) -> dict:
    """Record a new resume version and update confirmed_skills with merge logic.

    Normalization:
      skills_snapshot is normalized via _normalize_skills() before any merge —
      typos ("Jvaa"), aliases ("reactjs"), and duplicates are resolved first.

    Merge rules:
      - confidence >= 0.6  → normalized skills merged into confirmed_skills (union, no delete)
      - confidence <  0.6  → keep existing confirmed_skills unchanged

    Returns the updated meta dict.
    """
    meta = await load_resume_meta(student_token, student_profile)
    now = int(time.time())

    prev_version: int = meta.get("resume_version") or 0
    new_version = prev_version + 1

    old_confirmed: list[str] = meta.get("confirmed_skills") or []
    versions: list[dict] = meta.get("versions") or []

    # Normalize incoming skills + capture audit mapping
    normalized_snapshot, normalization_audit = _normalize_skills(skills_snapshot, return_audit=True)

    # Confidence gate: only merge when extraction is reliable
    _CONFIDENCE_THRESHOLD = 0.6
    if confidence >= _CONFIDENCE_THRESHOLD:
        # Safe merge: normalize old confirmed list too, then union
        old_normalized = _normalize_skills(old_confirmed)
        old_lower = {s.lower() for s in old_normalized}
        merged = list(old_normalized)
        for s in normalized_snapshot:
            if s.lower() not in old_lower:
                merged.append(s)
                old_lower.add(s.lower())
        new_confirmed = merged
        logger.info(
            "[SessionStore] resume_meta v%d: high-confidence (%.2f) — merged %d → %d confirmed skills",
            new_version, confidence, len(old_confirmed), len(new_confirmed),
        )
    else:
        new_confirmed = old_confirmed
        logger.warning(
            "[SessionStore] resume_meta v%d: low-confidence (%.2f) — keeping %d existing confirmed skills",
            new_version, confidence, len(old_confirmed),
        )

    # Append version record (stores both hashes + normalization audit)
    versions.append({
        "version": new_version,
        "status": "success",
        "resume_hash": resume_hash,
        "content_hash": content_hash,
        "parsed_at": now,
        "skills_snapshot": normalized_snapshot,
        "confidence": round(confidence, 3),
        "normalization_audit": normalization_audit,
    })
    if len(versions) > _RESUME_VERSIONS_MAX:
        versions = versions[-_RESUME_VERSIONS_MAX:]

    updated_meta = {
        **meta,
        "resume_hash": resume_hash,
        "content_hash": content_hash,
        "resume_version": new_version,
        "parsed_at": now,
        "confirmed_skills": new_confirmed,
        "versions": versions,
    }

    await save_resume_meta(student_token, updated_meta, student_profile)
    return updated_meta


async def append_resume_failure(
    student_token: str,
    reason: str,
    resume_hash: str = "",
    content_hash: str = "",
    student_profile: dict | None = None,
) -> None:
    """Record a failed resume processing attempt in the version history.

    Failure reasons (use these constants for consistency):
      "parse_failed"   — pdfminer / OCR returned empty text
      "empty_text"     — parse succeeded but text is blank
      "gemini_timeout" — Gemini extraction timed out
      "gemini_error"   — Gemini returned an error / invalid response
      "no_skills"      — extraction returned 0 skills
      "sync_failed"    — PATCH /student/profile returned non-2xx
      "invalid_file"   — file_bytes empty or unreadable

    Does NOT update resume_version counter or confirmed_skills — failures are
    purely informational in the audit trail.
    """
    meta = await load_resume_meta(student_token, student_profile)
    versions: list[dict] = meta.get("versions") or []
    now = int(time.time())

    versions.append({
        "version": meta.get("resume_version") or 0,
        "status": "failed",
        "reason": reason[:120],
        "resume_hash": resume_hash,
        "content_hash": content_hash,
        "timestamp": now,
    })
    if len(versions) > _RESUME_VERSIONS_MAX:
        versions = versions[-_RESUME_VERSIONS_MAX:]

    updated_meta = {**meta, "versions": versions}
    await save_resume_meta(student_token, updated_meta, student_profile)
    logger.warning("[SessionStore] resume_failure recorded: %s", reason)
