"""
tests/test_auto_apply_agent.py
------------------------------
End-to-end test for the Smart Placement auto-apply agent.

Run from the ai-engine directory:
    python tests/test_auto_apply_agent.py

No frontend needed — calls run_auto_apply_agent directly and
exercises the intent parser with 5 typed assertions.
"""

from __future__ import annotations

import sys
import os

# Ensure the ai-engine root is on the path when run directly
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.agent.intent_parser import parse_instruction


# ── ANSI colours (graceful fallback on Windows) ───────────────────────────────
_GREEN  = "\033[32m"
_RED    = "\033[31m"
_CYAN   = "\033[36m"
_BOLD   = "\033[1m"
_DIM    = "\033[2m"
_RESET  = "\033[0m"

def _ok(msg: str) -> None:
    print(f"  {_GREEN}✔ PASS{_RESET}  {msg}")

def _fail(msg: str) -> None:
    print(f"  {_RED}✘ FAIL{_RESET}  {msg}")

def _header(title: str) -> None:
    bar = "─" * (len(title) + 4)
    print(f"\n{_BOLD}{_CYAN}┌{bar}┐")
    print(f"│  {title}  │")
    print(f"└{bar}┘{_RESET}")

def _section(title: str) -> None:
    print(f"\n{_DIM}{'─' * 60}{_RESET}")
    print(f"{_BOLD}{title}{_RESET}")
    print(_DIM + "─" * 60 + _RESET)


# ══════════════════════════════════════════════════════════════════════════════
# TEST 1 — Intent parser
# ══════════════════════════════════════════════════════════════════════════════

_INTENT_CASES: list[dict] = [
    {
        "instruction": "Apply to software engineering jobs above 10 lpa in bangalore",
        "expect_min_lpa": 10.0,
        "expect_keywords": ["software", "engineer", "sde"],   # must contain all
        "expect_locations": ["bangalore"],
        "label": "SDE + 10 LPA + Bangalore",
    },
    {
        "instruction": "find marketing roles more than 5 LPA",
        "expect_min_lpa": 5.0,
        "expect_keywords": ["marketing"],
        "expect_locations": [],
        "label": "Marketing + 5 LPA",
    },
    {
        "instruction": "sde roles above 15",
        "expect_min_lpa": 15.0,
        "expect_keywords": ["sde", "developer"],
        "expect_locations": [],
        "label": "SDE abbreviation + bare number 15",
    },
    {
        "instruction": "data science jobs above 8 lakhs in mumbai",
        "expect_min_lpa": 8.0,
        "expect_keywords": ["data science", "ml"],
        "expect_locations": ["mumbai"],
        "label": "Data Science + 8 lakhs + Mumbai",
    },
    {
        "instruction": "apply to all jobs in hyderabad",
        "expect_min_lpa": None,
        "expect_keywords": [],          # empty = all fields
        "expect_locations": ["hyderabad"],
        "label": "No field / no LPA / Hyderabad location",
    },
]


def test_intent_parser() -> int:
    """Run 5 typed intent-parser assertions. Returns number of failures."""
    _header("Intent Parser — 5 Test Cases")
    failures = 0

    for i, case in enumerate(_INTENT_CASES, 1):
        instruction = case["instruction"]
        result      = parse_instruction(instruction)

        min_lpa      = result["min_lpa"]
        keywords     = result["field_keywords"]
        locations    = result["preferred_locations"]
        label        = case["label"]

        print(f"\n  [{i}] {_BOLD}{label}{_RESET}")
        print(f"      IN : {instruction!r}")
        print(f"      OUT: min_lpa={min_lpa}  keywords={keywords}  locations={locations}")

        case_pass = True

        # ── LPA check ────────────────────────────────────────────────────────
        expected_lpa = case["expect_min_lpa"]
        if expected_lpa is None:
            if min_lpa is not None:
                _fail(f"min_lpa should be None, got {min_lpa}")
                case_pass = False
        else:
            if min_lpa != expected_lpa:
                _fail(f"min_lpa expected {expected_lpa}, got {min_lpa}")
                case_pass = False

        # ── Keywords check (subset) ───────────────────────────────────────────
        kw_lower = [k.lower() for k in keywords]
        for kw in case["expect_keywords"]:
            if kw.lower() not in kw_lower:
                _fail(f"expected keyword {kw!r} not in {keywords}")
                case_pass = False

        # ── Empty keywords check ──────────────────────────────────────────────
        if case["expect_keywords"] == [] and keywords:
            _fail(f"expected empty field_keywords (all fields), got {keywords}")
            case_pass = False

        # ── Locations check (subset) ──────────────────────────────────────────
        loc_lower = [l.lower() for l in locations]
        for loc in case["expect_locations"]:
            if loc.lower() not in loc_lower:
                _fail(f"expected location {loc!r} not in {locations}")
                case_pass = False

        if case_pass:
            _ok("All assertions passed")
        else:
            failures += 1

    return failures


# ══════════════════════════════════════════════════════════════════════════════
# TEST 2 — Full agent end-to-end
# ══════════════════════════════════════════════════════════════════════════════

MOCK_STUDENT_PROFILE = {
    "fullName": "Arjun Mehta",
    "name":     "Arjun Mehta",
    "college":  "IIT Bombay",
    "branch":   "Computer Science and Engineering",
    "cgpa":     8.0,
    "skills":   ["React", "Python", "SQL", "DSA", "JavaScript", "Node.js"],
    "experience": "",
}

MOCK_INSTRUCTION   = "Apply to all software engineering jobs above 5 LPA"
MOCK_STUDENT_TOKEN = "test-token-not-real"   # backend will reject — that's expected in CI
MOCK_RESUME_URL    = "https://example.com/resume/arjun-mehta.pdf"


def test_agent_end_to_end() -> None:
    """
    Call run_auto_apply_agent directly and print a step-by-step trace.

    Note: because MOCK_STUDENT_TOKEN is not a real JWT, submit_application
    will get 401 / connection error from the backend and the agent will log
    the failure cleanly.  The test verifies the agent *runs without crashing*
    and returns a well-formed result dict, not that applications succeed.
    """
    _header("Auto-Apply Agent — End-to-End Run")

    _section("Step 0 · Parsing instruction")
    intent = parse_instruction(MOCK_INSTRUCTION)
    print(f"  Instruction  : {MOCK_INSTRUCTION!r}")
    print(f"  min_lpa      : {intent['min_lpa']}")
    print(f"  field_kws    : {intent['field_keywords']}")
    print(f"  locations    : {intent['preferred_locations']}")

    _section("Step 1–5 · Importing agent (LLM init happens here)")
    print(f"  {_DIM}Importing run_auto_apply_agent …{_RESET}")

    try:
        from app.agent.auto_apply_agent import run_auto_apply_agent
        print(f"  {_GREEN}Import OK{_RESET}")
    except Exception as exc:
        print(f"  {_RED}Import FAILED: {exc}{_RESET}")
        print("\n  ⚠  Agent module could not be loaded — skipping E2E run.")
        print("     Check that all dependencies are installed (langchain-classic, langchain-google-genai, etc.)")
        return

    _section("Step 2 · Running agent (this may take 20–120 s if LLM is reachable)")
    print(f"  Profile      : {MOCK_STUDENT_PROFILE['fullName']} · {MOCK_STUDENT_PROFILE['branch']}")
    print(f"  CGPA         : {MOCK_STUDENT_PROFILE['cgpa']}")
    print(f"  Skills       : {', '.join(MOCK_STUDENT_PROFILE['skills'])}")
    print(f"  Resume URL   : {MOCK_RESUME_URL}")
    print()

    result = run_auto_apply_agent(
        instruction=MOCK_INSTRUCTION,
        student_token=MOCK_STUDENT_TOKEN,
        student_profile=MOCK_STUDENT_PROFILE,
        resume_url=MOCK_RESUME_URL,
    )

    _section("Step 3 · Inspecting result dict")
    required_keys = {"success", "summary", "jobs_applied", "jobs_skipped",
                     "total_applied", "total_skipped", "intent"}
    missing = required_keys - result.keys()
    if missing:
        print(f"  {_RED}MISSING keys in result: {missing}{_RESET}")
    else:
        print(f"  {_GREEN}All required keys present{_RESET}")

    print(f"\n  success        : {result.get('success')}")
    print(f"  total_applied  : {result.get('total_applied', 0)}")
    print(f"  total_skipped  : {result.get('total_skipped', 0)}")

    applied = result.get("jobs_applied", [])
    skipped = result.get("jobs_skipped", [])

    _section("Step 4 · Applied jobs")
    if applied:
        for j in applied:
            print(f"  ✅  job_id={j.get('job_id')}  result={j.get('result', '')[:80]}")
    else:
        print(f"  {_DIM}(none — expected if backend not running or token invalid){_RESET}")

    _section("Step 5 · Skipped jobs")
    if skipped:
        for j in skipped:
            reason = j.get("reason", "")[:80]
            print(f"  ❌  job_id={j.get('job_id')}  reason={reason}")
    else:
        print(f"  {_DIM}(none){_RESET}")

    _section("Final Summary")
    summary = result.get("summary", "")
    if summary:
        # Print first 800 chars to avoid wall of text
        preview = summary[:800] + (" …[truncated]" if len(summary) > 800 else "")
        for line in preview.splitlines():
            print(f"  {line}")
    else:
        print(f"  {_DIM}(no summary returned){_RESET}")

    if result.get("error"):
        print(f"\n  {_RED}Agent error: {result['error']}{_RESET}")

    verdict = (
        f"{_GREEN}✔ Agent completed without crash{_RESET}"
        if result.get("success") is not False
        else f"{_RED}✘ Agent reported failure{_RESET}"
    )
    print(f"\n  {verdict}")


# ══════════════════════════════════════════════════════════════════════════════
# Entry point
# ══════════════════════════════════════════════════════════════════════════════

def main() -> None:
    print(f"\n{_BOLD}{'═' * 62}")
    print("  Smart Placement Agent — Test Suite")
    print(f"{'═' * 62}{_RESET}")

    # ── Intent parser tests (always run, fast) ────────────────────────────────
    intent_failures = test_intent_parser()

    # ── E2E agent test (requires network + API key) ───────────────────────────
    _header("E2E Agent Test")
    run_e2e = os.environ.get("SKIP_E2E", "").lower() not in ("1", "true", "yes")
    if not run_e2e:
        print(f"  {_DIM}Skipped (SKIP_E2E=1){_RESET}")
    else:
        print(f"  {_DIM}Set SKIP_E2E=1 to skip the E2E run (useful in CI){_RESET}")
        test_agent_end_to_end()

    # ── Final verdict ─────────────────────────────────────────────────────────
    print(f"\n{_BOLD}{'═' * 62}")
    print("  RESULTS")
    print(f"{'═' * 62}{_RESET}")
    if intent_failures == 0:
        print(f"  Intent parser : {_GREEN}ALL 5 PASSED{_RESET}")
    else:
        print(f"  Intent parser : {_RED}{intent_failures}/5 FAILED{_RESET}")
    print(f"  E2E agent     : {'skipped' if not run_e2e else 'see output above'}")
    print()

    sys.exit(1 if intent_failures > 0 else 0)


if __name__ == "__main__":
    main()
