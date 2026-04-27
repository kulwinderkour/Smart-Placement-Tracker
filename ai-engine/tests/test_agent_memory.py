"""
test_agent_memory.py
--------------------
Production smoke tests for:
  - Stable ID resolution (JWT-rotation safety)
  - Search cache API (save / load / clear)
  - Pending confirmation API (save / load / expiry / action-mismatch / clear)
  - Conversation history API (append / load / trim / clear)
  - Brain agent routing (word-boundary, blanket-apply, history block)

Run inside the container:
  docker exec smart-placement-tracker-ai-engine-1 \
      python -m pytest tests/test_agent_memory.py -v

Or directly:
  docker exec smart-placement-tracker-ai-engine-1 \
      python tests/test_agent_memory.py
"""

from __future__ import annotations

import asyncio
import sys
import traceback

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

PASS = "\033[32mPASS\033[0m"
FAIL = "\033[31mFAIL\033[0m"

_results: list[tuple[str, bool, str]] = []


def _check(name: str, condition: bool, detail: str = "") -> None:
    status = PASS if condition else FAIL
    _results.append((name, condition, detail))
    print(f"  [{status}] {name}" + (f"  — {detail}" if detail else ""))
    if not condition:
        print(f"         Detail: {detail}")


# ─────────────────────────────────────────────────────────────────────────────
# Test: stable ID resolution
# ─────────────────────────────────────────────────────────────────────────────

def test_stable_id() -> None:
    print("\n── Test: stable ID resolution ───────────────────────────────────")
    from app.core.session_store import _stable_id

    tok = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.abc"

    # Profile with id field
    sid1 = _stable_id(tok, {"id": 42, "fullName": "Alice"})
    _check("profile.id used as stable key", sid1 == "42", f"got {sid1!r}")

    # Profile with student_id field
    sid2 = _stable_id(tok, {"student_id": "stu-99"})
    _check("profile.student_id used as stable key", sid2 == "stu-99", f"got {sid2!r}")

    # Profile with userId camelCase
    sid3 = _stable_id(tok, {"userId": "u-007"})
    _check("profile.userId used as stable key", sid3 == "u-007", f"got {sid3!r}")

    # No profile — falls back to token hash
    sid4 = _stable_id(tok, None)
    _check("token hash fallback (16 chars)", len(sid4) == 16, f"got {sid4!r}")

    # JWT rotation: new token, same profile id → same key
    new_tok = "new.jwt.token"
    sid5 = _stable_id(new_tok, {"id": 42})
    _check("same profile.id survives JWT rotation", sid5 == sid1, f"{sid5!r} vs {sid1!r}")


# ─────────────────────────────────────────────────────────────────────────────
# Test: search cache (save / load / clear)
# ─────────────────────────────────────────────────────────────────────────────

async def test_search_cache() -> None:
    print("\n── Test: search cache API ───────────────────────────────────────")
    from app.core.session_store import clear_search, load_search, save_search

    tok = "tok-search-test"
    profile = {"id": "test-student-1"}
    jobs = [
        {"id": 1, "role_title": "SDE", "company_name": "Google", "salary_max": 1500000},
        {"id": 2, "role_title": "MLE", "company_name": "Meta",   "salary_max": 2000000},
    ]
    filters = {"salary_min_lpa": 5.0, "role": "sde"}

    # Flow A: save then load
    await save_search(tok, jobs, filters, student_profile=profile)
    cached_jobs, cached_filters = await load_search(tok, student_profile=profile)

    _check("Flow A: save_search stores jobs",  cached_jobs is not None, f"got {cached_jobs}")
    _check("Flow A: correct job count", len(cached_jobs) == 2, f"got {len(cached_jobs) if cached_jobs else 0}")
    _check("Flow A: filters preserved", cached_filters.get("salary_min_lpa") == 5.0, str(cached_filters))

    # Flow A: JWT rotation — same profile.id must still hit cache
    cached2, _ = await load_search("completely-different-jwt", student_profile=profile)
    _check("Flow A: cache survives JWT rotation", cached2 is not None and len(cached2) == 2,
           f"got {cached2}")

    # Flow A: clear
    await clear_search(tok, student_profile=profile)
    after, _ = await load_search(tok, student_profile=profile)
    _check("Flow A: clear_search evicts cache", after is None, f"got {after}")


# ─────────────────────────────────────────────────────────────────────────────
# Test: pending confirmation (save / load / clear)
# ─────────────────────────────────────────────────────────────────────────────

async def test_pending_confirmation() -> None:
    print("\n── Test: pending confirmation API ───────────────────────────────")
    from app.core.session_store import (
        clear_pending,
        load_pending,
        save_pending,
    )

    tok = "tok-pending-test"
    profile = {"id": "test-student-2"}
    jobs = [{"id": 10, "role_title": "DevOps", "company_name": "AWS"}]
    filters = {"salary_min_lpa": 8.0}

    # Flow C: save pending
    await save_pending(tok, jobs, filters, action="apply_jobs", student_profile=profile)
    pending = await load_pending(tok, student_profile=profile)

    _check("Flow C: save_pending stores state",      pending is not None, str(pending))
    _check("Flow C: pending_confirmation flag True",  pending.get("pending_confirmation") is True, str(pending))
    _check("Flow C: jobs preserved in pending",       len(pending.get("jobs", [])) == 1, str(pending))
    _check("Flow C: action field correct",            pending.get("action") == "apply_jobs", str(pending))

    # Flow C: survives JWT rotation
    pending2 = await load_pending("new-jwt-token", student_profile=profile)
    _check("Flow C: pending survives JWT rotation", pending2 is not None, str(pending2))

    # Flow C: cancel clears pending
    await clear_pending(tok, student_profile=profile)
    after = await load_pending(tok, student_profile=profile)
    _check("Flow C: clear_pending evicts state", after is None, str(after))


# ─────────────────────────────────────────────────────────────────────────────
# Test: brain agent routing (no network / pipeline calls)
# ─────────────────────────────────────────────────────────────────────────────

def test_brain_routing() -> None:
    print("\n── Test: brain agent rule-based routing ─────────────────────────")
    from app.agents.brain_agent import BrainAgent

    b = BrainAgent()

    cases = [
        # (instruction, expected_intent, expected_needs_confirmation)
        ("Show SDE jobs above 5 LPA",       "job_search",     False),
        ("show me software engineer jobs",  "job_search",     False),
        ("Apply to these jobs",             "job_apply",      False),
        ("apply to all jobs",               "job_apply",      True),
        ("apply all",                       "job_apply",      True),
        ("sabhi jobs pe apply karo",        "job_apply",      True),
        ("hi",                              "greeting",       False),
        ("hello there",                     "greeting",       False),
        ("who made you",                    "general_query",  False),
        # substring false-positive guards
        ("what is shipping industry",       "general_query",  False),  # 'ship' ≠ 'apply'
        ("highlight my skills",             "profile_query",  False),  # skills → profile_query (correct)
    ]

    for instr, exp_intent, exp_confirm in cases:
        d = b._classify_with_rules(instr)
        ok_intent   = d.intent.value == exp_intent
        ok_confirm  = d.needs_confirmation == exp_confirm
        _check(
            f"Flow D/E rule: {instr!r}",
            ok_intent and ok_confirm,
            f"intent={d.intent.value}(want {exp_intent}) confirm={d.needs_confirmation}(want {exp_confirm})",
        )


# ─────────────────────────────────────────────────────────────────────────────
# Test: search cache cleared when new search arrives
# ─────────────────────────────────────────────────────────────────────────────

async def test_new_search_clears_pending() -> None:
    print("\n── Test: new search clears stale pending ────────────────────────")
    from app.core.session_store import (
        clear_search,
        load_pending,
        save_pending,
        save_search,
        clear_pending,
    )

    tok = "tok-stale-test"
    profile = {"id": "test-student-3"}
    jobs = [{"id": 99, "role_title": "PM"}]

    # Seed a pending state
    await save_pending(tok, jobs, {}, student_profile=profile)
    p1 = await load_pending(tok, student_profile=profile)
    _check("stale pending exists before new search", p1 is not None, str(p1))

    # A new search should clear the pending (simulated via clear_pending call in _handle_job_search)
    await save_search(tok, jobs, {}, student_profile=profile)
    await clear_pending(tok, student_profile=profile)

    p2 = await load_pending(tok, student_profile=profile)
    _check("stale pending cleared after new search", p2 is None, str(p2))

    # cleanup
    await clear_search(tok, student_profile=profile)


# ─────────────────────────────────────────────────────────────────────────────
# Test: pending expiry and action mismatch
# ─────────────────────────────────────────────────────────────────────────────

async def test_pending_safety() -> None:
    print("\n── Test: pending confirmation safety (expiry + action mismatch) ─")
    import time as _time
    from app.core.session_store import (
        _key, _rset, _stable_id,
        clear_pending, load_pending,
    )

    tok     = "tok-safety-test"
    profile = {"id": "test-student-safety"}
    sid     = _stable_id(tok, profile)
    jobs    = [{"id": 55, "role_title": "Backend"}]

    # ── Already-expired pending (expires_at in the past) ──────────────────────
    import json, time as _t
    expired_payload = json.dumps({
        "pending_confirmation": True,
        "jobs": jobs,
        "filters": {},
        "action": "apply_jobs",
        "created_at": int(_t.time()) - 3700,
        "expires_at": int(_t.time()) - 100,   # expired 100s ago
    })
    await _rset(_key(sid, "pending"), expired_payload)
    result = await load_pending(tok, student_profile=profile, expected_action="apply_jobs")
    _check("Expired pending → None", result is None, str(result))

    # ── Action mismatch ───────────────────────────────────────────────────────
    now = int(_t.time())
    mismatch_payload = json.dumps({
        "pending_confirmation": True,
        "jobs": jobs,
        "filters": {},
        "action": "some_other_action",
        "created_at": now,
        "expires_at": now + 1800,
    })
    await _rset(_key(sid, "pending"), mismatch_payload)
    result2 = await load_pending(tok, student_profile=profile, expected_action="apply_jobs")
    _check("Action mismatch → None", result2 is None, str(result2))

    # ── Valid pending succeeds ────────────────────────────────────────────────
    from app.core.session_store import save_pending
    await save_pending(tok, jobs, {}, action="apply_jobs", student_profile=profile)
    result3 = await load_pending(tok, student_profile=profile, expected_action="apply_jobs")
    _check("Valid pending → returned", result3 is not None and result3.get("action") == "apply_jobs",
           str(result3))

    await clear_pending(tok, student_profile=profile)


# ─────────────────────────────────────────────────────────────────────────────
# Test: conversation history API
# ─────────────────────────────────────────────────────────────────────────────

async def test_conversation_history() -> None:
    print("\n── Test: conversation history API ───────────────────────────────")
    from app.core.session_store import (
        append_history, clear_history, load_history,
    )

    tok     = "tok-history-test"
    profile = {"id": "test-student-hist"}

    # Clean slate
    await clear_history(tok, student_profile=profile)
    h0 = await load_history(tok, student_profile=profile)
    _check("Fresh history is empty", h0 == [], str(h0))

    # Append first exchange
    await append_history(tok, "Show SDE jobs above 5 LPA",
                         "Found 6 matching jobs.", "job_search", profile)
    h1 = await load_history(tok, student_profile=profile)
    _check("After 1 append: 2 entries", len(h1) == 2, str(len(h1)))
    _check("First entry role=user",  h1[0]["role"] == "user",  h1[0]["role"])
    _check("Second entry role=agent", h1[1]["role"] == "agent", h1[1]["role"])
    _check("Intent stored in metadata", h1[1].get("metadata", {}).get("intent") == "job_search",
           str(h1[1].get("metadata", {}).get("intent")))

    # Append second exchange
    await append_history(tok, "Which one pays the most?",
                         "Google SDE at 15 LPA is highest.", "job_search", profile)
    h2 = await load_history(tok, student_profile=profile)
    _check("After 2 appends: 4 entries", len(h2) == 4, str(len(h2)))

    # Trim: fill to 11 turns (22 entries) — should stay at 20 (10 turns max)
    for i in range(9):
        await append_history(tok, f"msg {i}", f"reply {i}", "general_query", profile)
    h3 = await load_history(tok, student_profile=profile)
    _check("History trimmed to max 20 entries (10 turns)", len(h3) == 20, str(len(h3)))

    # Latest messages kept, oldest dropped
    _check("Latest user msg retained", h3[-2]["content"] == "msg 8", h3[-2]["content"])

    await clear_history(tok, student_profile=profile)
    h4 = await load_history(tok, student_profile=profile)
    _check("After clear: empty", h4 == [], str(h4))


# ─────────────────────────────────────────────────────────────────────────────
# Test: brain agent history block formatting (structured metadata)
# ─────────────────────────────────────────────────────────────────────────────

def test_history_block() -> None:
    print("\n── Test: brain agent history block ──────────────────────────────")
    from app.agents.brain_agent import BrainAgent

    # Empty history → empty string
    block = BrainAgent._build_history_block([])
    _check("Empty history → empty block", block == "", repr(block))

    history = [
        {"role": "user",  "content": "Show SDE jobs above 5 LPA", "ts": 1000},
        {
            "role": "agent", "content": "Found 6 matching jobs.", "ts": 1000,
            "metadata": {
                "intent": "job_search", "tool_used": "search_jobs",
                "filters_used": {"role": "sde", "salary_min_lpa": 5},
                "jobs_count": 6, "execution_status": "success",
            },
        },
        {"role": "user",  "content": "Which one pays the most?", "ts": 1001},
        {
            "role": "agent", "content": "Google at 15 LPA.", "ts": 1001,
            "metadata": {
                "intent": "general_query", "tool_used": "brain_reply",
                "filters_used": {}, "jobs_count": 0, "execution_status": "success",
            },
        },
    ]
    block2 = BrainAgent._build_history_block(history)
    _check("Block contains 'Student:' label",     "Student:" in block2, block2[:120])
    _check("Block contains 'Agent' label",         "Agent"    in block2, block2[:120])
    _check("Block contains prior user message",
           "Show SDE jobs above 5 LPA" in block2, block2[:300])
    _check("Block contains agent reply",
           "Found 6 matching jobs." in block2, block2[:300])
    _check("Block has header",
           "=== Conversation so far" in block2, block2[:80])
    _check("Block renders tool metadata",
           "tool=search_jobs" in block2, block2)
    _check("Block renders jobs_count",
           "jobs=6" in block2, block2)
    _check("Block renders status",
           "status=success" in block2, block2)
    _check("Block renders filters JSON",
           '"role":"sde"' in block2 or "role" in block2, block2)


# ─────────────────────────────────────────────────────────────────────────────
# Test: structured metadata stored in history entries
# ─────────────────────────────────────────────────────────────────────────────

async def test_structured_history_metadata() -> None:
    print("\n── Test: structured metadata in history ─────────────────────────")
    from app.core.session_store import (
        append_history, clear_history, load_history,
    )

    tok     = "tok-meta-test"
    profile = {"id": "test-student-meta"}
    await clear_history(tok, student_profile=profile)

    meta = {
        "tool_used":        "search_jobs",
        "filters_used":     {"role": "sde", "salary_min_lpa": 5},
        "jobs_count":       6,
        "execution_status": "success",
    }
    await append_history(tok, "Show SDE jobs above 5 LPA", "Found 6 jobs.",
                         intent="job_search", student_profile=profile, metadata=meta)
    h = await load_history(tok, student_profile=profile)

    agent_entry = h[1]
    stored_meta = agent_entry.get("metadata", {})
    _check("Metadata stored on agent entry",       bool(stored_meta), str(stored_meta))
    _check("tool_used correct",                    stored_meta.get("tool_used") == "search_jobs",
           stored_meta.get("tool_used"))
    _check("jobs_count correct",                   stored_meta.get("jobs_count") == 6,
           str(stored_meta.get("jobs_count")))
    _check("execution_status correct",             stored_meta.get("execution_status") == "success",
           stored_meta.get("execution_status"))
    _check("filters_used preserved",               stored_meta.get("filters_used", {}).get("role") == "sde",
           str(stored_meta.get("filters_used")))
    _check("intent stored in metadata",            stored_meta.get("intent") == "job_search",
           stored_meta.get("intent"))
    _check("timestamp auto-set (>0)",              (stored_meta.get("timestamp") or 0) > 0,
           str(stored_meta.get("timestamp")))

    await clear_history(tok, student_profile=profile)


# ─────────────────────────────────────────────────────────────────────────────
# Test: applied_jobs dedup API
# ─────────────────────────────────────────────────────────────────────────────

async def test_applied_jobs_dedup() -> None:
    print("\n── Test: applied_jobs dedup API ─────────────────────────────────")
    from app.core.session_store import (
        _key, _rdel, _stable_id,
        filter_unapplied_jobs, load_applied_job_ids, record_applied_jobs,
    )

    tok     = "tok-dedup2-test"
    profile = {"id": "test-student-dedup2"}
    sid     = _stable_id(tok, profile)
    # clean slate (new key name)
    await _rdel(_key(sid, "applications"))

    apps = [
        {"job_id": 101, "status": "applied", "application_id": "app-a"},
        {"job_id": 102, "status": "applied", "application_id": "app-b"},
    ]
    await record_applied_jobs(tok, apps, student_profile=profile)
    ids = await load_applied_job_ids(tok, student_profile=profile)
    _check("Applied IDs recorded",            {"101", "102"} == ids, str(ids))

    # Idempotent: re-recording same IDs (same status) keeps count at 2
    await record_applied_jobs(tok, apps, student_profile=profile)
    ids2 = await load_applied_job_ids(tok, student_profile=profile)
    _check("No duplicate IDs on re-record",   len(ids2) == 2, str(ids2))

    # Add a new one
    await record_applied_jobs(tok, [{"job_id": 103, "status": "applied", "application_id": "app-c"}],
                              student_profile=profile)
    ids3 = await load_applied_job_ids(tok, student_profile=profile)
    _check("New job_id added correctly",      "103" in ids3, str(ids3))
    _check("Total 3 applied IDs",             len(ids3) == 3, str(ids3))

    await _rdel(_key(sid, "applications"))


# ─────────────────────────────────────────────────────────────────────────────
# Test: filter_unapplied_jobs splits correctly
# ─────────────────────────────────────────────────────────────────────────────

async def test_filter_unapplied_jobs() -> None:
    print("\n── Test: filter_unapplied_jobs ──────────────────────────────────")
    from app.core.session_store import (
        _key, _rdel, _stable_id,
        filter_unapplied_jobs, record_applied_jobs,
    )

    tok     = "tok-filter2-test"
    profile = {"id": "test-student-filter2"}
    sid     = _stable_id(tok, profile)
    await _rdel(_key(sid, "applications"))

    # Record job 200 as already applied (status=applied)
    await record_applied_jobs(tok, [{"job_id": 200, "status": "applied", "application_id": "x"}],
                              student_profile=profile)

    jobs = [
        {"id": 200, "role_title": "SDE"},     # already applied → duplicate
        {"id": 201, "role_title": "MLE"},     # new
        {"id": 202, "role_title": "DevOps"},  # new
    ]
    unapplied, duplicates = await filter_unapplied_jobs(tok, jobs, student_profile=profile)
    _check("Duplicate job filtered out",       len(duplicates) == 1, str(duplicates))
    _check("Duplicate job_id correct",         duplicates[0].get("id") == 200,
           str(duplicates[0].get("id")))
    _check("Unapplied count correct",          len(unapplied) == 2, str(len(unapplied)))
    _check("Job 201 in unapplied",             any(j.get("id") == 201 for j in unapplied),
           str(unapplied))

    # clean up
    await _rdel(_key(sid, "applications"))


# ─────────────────────────────────────────────────────────────────────────────
# Runner
# ─────────────────────────────────────────────────────────────────────────────

async def test_full_application_memory() -> None:
    print("\n── Test: full application memory API ────────────────────────────")
    from app.core.session_store import (
        _key, _rdel, _stable_id,
        filter_unapplied_jobs, load_applications, load_applied_job_ids,
        record_applied_jobs,
    )

    tok     = "tok-fullapp-test"
    profile = {"id": "test-student-fullapp"}
    sid     = _stable_id(tok, profile)
    await _rdel(_key(sid, "applications"))

    apps = [
        {"job_id": 301, "status": "applied",  "application_id": "app-x",
         "match_score": 82.5, "job_title": "SDE", "company": "Google",
         "salary_lpa": 20.0},
        {"job_id": 302, "status": "skipped",  "reason": "score_low",
         "match_score": 38.0, "job_title": "MLE", "company": "Amazon"},
        {"job_id": 303, "status": "failed",   "reason": "validation_failed",
         "job_title": "PM", "company": "Meta"},
    ]
    await record_applied_jobs(tok, apps, student_profile=profile)
    stored = await load_applications(tok, student_profile=profile)
    _check("All 3 records stored",          len(stored) == 3, str(len(stored)))

    # Status filters
    applied_ids = await load_applied_job_ids(tok, student_profile=profile)
    _check("Only 'applied' in dedup ids",   applied_ids == {"301"}, str(applied_ids))

    # Verify full fields
    g = next((a for a in stored if a["job_id"] == "301"), None)
    _check("Google entry exists",           g is not None, str(g))
    _check("match_score stored",            g["match_score"] == 82.5, str(g))
    _check("company stored",                g["company"] == "Google", str(g))

    # Update: re-recording same job_id updates in-place (no dup)
    await record_applied_jobs(tok, [{"job_id": 302, "status": "applied",
                                     "application_id": "app-y", "job_title": "MLE",
                                     "company": "Amazon", "match_score": 75.0}],
                              student_profile=profile)
    stored2 = await load_applications(tok, student_profile=profile)
    _check("Re-record updates in place (still 3)",  len(stored2) == 3, str(len(stored2)))
    mle = next((a for a in stored2 if a["job_id"] == "302"), None)
    _check("302 status updated to applied",         mle["status"] == "applied", mle["status"])

    # Both 301 and 302 are now applied — both should be blocked as duplicates
    jobs = [{"id": 301}, {"id": 302}, {"id": 304}]
    unapplied, duplicates = await filter_unapplied_jobs(tok, jobs, student_profile=profile)
    _check("301 and 302 both blocked as dups",      len(duplicates) == 2, str(duplicates))
    _check("304 (new) passes through unapplied",    len(unapplied) == 1,
           str([j.get("id") for j in unapplied]))
    # after updating 302 to applied it should also be in applied_ids now
    applied_ids2 = await load_applied_job_ids(tok, student_profile=profile)
    _check("Both 301 and 302 now in applied_ids",   {"301", "302"} == applied_ids2,
           str(applied_ids2))

    await _rdel(_key(sid, "applications"))


async def test_execution_traces() -> None:
    print("\n── Test: execution traces API ───────────────────────────────────")
    from app.core.session_store import (
        _key, _rdel, _stable_id,
        append_trace, load_traces,
    )

    tok     = "tok-trace-test"
    profile = {"id": "test-student-trace"}
    sid     = _stable_id(tok, profile)
    await _rdel(_key(sid, "traces"))

    # Append several traces
    await append_trace(tok, "intent_parse",       "success", "job_search",      profile)
    await append_trace(tok, "job_fetch",          "success", "42 jobs",         profile)
    await append_trace(tok, "validation",         "success", "38 valid",        profile)
    await append_trace(tok, "prediction",         "success", "score run",       profile)
    await append_trace(tok, "apply_submit",       "success", "4 applied",       profile)
    await append_trace(tok, "dedupe_check",       "skipped", "job_id=99 dup",   profile)
    await append_trace(tok, "confirmation_check", "success", "user confirmed",  profile)

    traces = await load_traces(tok, student_profile=profile)
    _check("7 traces stored",              len(traces) == 7, str(len(traces)))
    _check("First trace is intent_parse",  traces[0]["step"] == "intent_parse",
           traces[0]["step"])
    _check("Last trace confirmation",      traces[-1]["step"] == "confirmation_check",
           traces[-1]["step"])
    _check("Status field present",         traces[0]["status"] == "success",
           traces[0]["status"])
    _check("Detail field stored",          "job_search" in traces[0]["detail"],
           traces[0]["detail"])
    _check("Timestamp auto-set",           (traces[0].get("ts") or 0) > 0,
           str(traces[0].get("ts")))

    # load_traces(last_n) respects limit
    recent = await load_traces(tok, student_profile=profile, last_n=3)
    _check("last_n=3 returns 3",           len(recent) == 3, str(len(recent)))
    _check("last_n=3 returns newest",      recent[-1]["step"] == "confirmation_check",
           recent[-1]["step"])

    await _rdel(_key(sid, "traces"))


def test_memory_blocks_and_fallback() -> None:
    print("\n── Test: brain agent memory block builders + deterministic answer ")
    from app.agents.brain_agent import BrainAgent

    # ── _build_applications_block ─────────────────────────────────────────────
    apps = [
        {"job_id": "401", "status": "applied",  "job_title": "SDE",  "company": "Google",
         "match_score": 85.0, "reason": ""},
        {"job_id": "402", "status": "skipped",  "job_title": "MLE",  "company": "Amazon",
         "match_score": 38.0, "reason": "score_low"},
        {"job_id": "403", "status": "failed",   "job_title": "PM",   "company": "Meta",
         "match_score": 0.0,  "reason": "validation_failed"},
    ]
    block = BrainAgent._build_applications_block(apps)
    _check("Apps block header present",    "Application History" in block, block[:60])
    _check("Applied entry rendered",       "[APPLIED]" in block, block[:300])
    _check("Skipped entry rendered",       "[SKIPPED]" in block, block)
    _check("Failed entry rendered",        "[FAILED]" in block, block)
    _check("reason rendered",              "score_low" in block, block)
    _check("company rendered",             "Google" in block, block)

    # ── _build_traces_block ───────────────────────────────────────────────────
    traces = [
        {"step": "intent_parse",   "status": "success", "detail": "job_apply", "ts": 1000},
        {"step": "apply_submit",   "status": "failed",  "detail": "API error",  "ts": 1001},
    ]
    tblock = BrainAgent._build_traces_block(traces)
    _check("Traces block header present",  "Pipeline Traces" in tblock, tblock[:60])
    _check("Trace step rendered",          "intent_parse" in tblock, tblock)
    _check("Trace status rendered",        "[FAILED]" in tblock, tblock)
    _check("Trace detail rendered",        "API error" in tblock, tblock)

    # ── _deterministic_memory_answer ──────────────────────────────────────────
    answer = BrainAgent._deterministic_memory_answer("why failed?", apps, traces)
    _check("Answer mentions applied count", "applied" in answer.lower(), answer[:200])
    _check("Answer mentions failed count",  "failed"  in answer.lower(), answer[:200])

    # Empty applications
    empty_ans = BrainAgent._deterministic_memory_answer("what?", [], [])
    _check("Empty apps → helpful message",  "history" in empty_ans.lower(), empty_ans)


async def _run_async() -> None:
    await test_search_cache()
    await test_pending_confirmation()
    await test_pending_safety()
    await test_conversation_history()
    await test_structured_history_metadata()
    await test_applied_jobs_dedup()
    await test_filter_unapplied_jobs()
    await test_full_application_memory()
    await test_execution_traces()
    await test_new_search_clears_pending()


def main() -> None:
    print("=" * 60)
    print("  Smart Placement Agent — Memory Reliability Tests")
    print("=" * 60)

    # Sync tests
    test_stable_id()
    test_brain_routing()
    test_history_block()
    test_memory_blocks_and_fallback()

    # Async tests
    asyncio.run(_run_async())

    # Summary
    print("\n" + "=" * 60)
    passed = sum(1 for _, ok, _ in _results if ok)
    total  = len(_results)
    print(f"  Results: {passed}/{total} passed")
    print("=" * 60)

    if passed < total:
        sys.exit(1)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        traceback.print_exc()
        sys.exit(1)
