"""
intent_parser.py
Pure-Python parser that converts a student's natural language instruction
into a structured intent dictionary. No LLM calls are made here.
"""

from __future__ import annotations

import re
from typing import Any

# ── Field keyword map ────────────────────────────────────────────────────────
# Keys are lowercase trigger phrases / abbreviations found in instructions.
# Values are the canonical keyword lists used for job matching.

FIELD_KEYWORD_MAP: dict[str, list[str]] = {
    # Software / engineering
    "software engineering": ["software", "engineer", "sde", "developer", "backend", "fullstack"],
    "software engineer":    ["software", "engineer", "sde", "developer", "backend", "fullstack"],
    "sde":                  ["software", "engineer", "sde", "developer", "backend", "fullstack"],
    "software developer":   ["software", "engineer", "sde", "developer", "backend", "fullstack"],
    "backend":              ["backend", "server", "api", "software", "developer", "engineer"],
    "frontend":             ["frontend", "ui", "react", "angular", "vue", "developer"],
    "fullstack":            ["fullstack", "full stack", "full-stack", "software", "developer", "engineer"],
    "full stack":           ["fullstack", "full stack", "full-stack", "software", "developer", "engineer"],
    "web development":      ["web", "frontend", "backend", "fullstack", "developer"],
    "web developer":        ["web", "frontend", "backend", "fullstack", "developer"],

    # Data / ML / AI
    "data science":         ["data science", "data scientist", "ml", "machine learning", "analytics", "python"],
    "data scientist":       ["data science", "data scientist", "ml", "machine learning", "analytics"],
    "machine learning":     ["machine learning", "ml", "ai", "deep learning", "data science", "python"],
    "ml":                   ["machine learning", "ml", "ai", "deep learning", "data science"],
    "ai":                   ["ai", "artificial intelligence", "machine learning", "ml", "deep learning"],
    "data analyst":         ["data analyst", "analytics", "sql", "excel", "bi", "tableau"],
    "data engineering":     ["data engineer", "etl", "pipeline", "spark", "hadoop", "bigdata"],
    "data engineer":        ["data engineer", "etl", "pipeline", "spark", "hadoop", "bigdata"],

    # Marketing
    "marketing":            ["marketing", "digital marketing", "brand", "content", "growth"],
    "digital marketing":    ["digital marketing", "seo", "sem", "social media", "content", "growth"],
    "content":              ["content", "copywriting", "content marketing", "writing", "editor"],
    "growth":               ["growth", "growth hacking", "marketing", "acquisition"],

    # Finance
    "finance":              ["finance", "financial", "analyst", "accounting", "ca"],
    "financial analyst":    ["financial analyst", "finance", "accounting", "valuation", "investment"],
    "accounting":           ["accounting", "accountant", "finance", "audit", "tax"],
    "ca":                   ["ca", "chartered accountant", "finance", "accounting", "audit"],
    "investment banking":   ["investment banking", "ib", "finance", "valuation", "m&a"],

    # HR / People
    "hr":                   ["hr", "human resources", "talent", "recruitment"],
    "human resources":      ["hr", "human resources", "talent", "recruitment"],
    "talent acquisition":   ["talent acquisition", "recruitment", "hr", "hiring"],
    "recruitment":          ["recruitment", "recruiter", "hr", "talent", "hiring"],

    # Product / Design
    "product management":   ["product manager", "pm", "product", "roadmap", "agile"],
    "product manager":      ["product manager", "pm", "product", "roadmap", "agile"],
    "pm":                   ["product manager", "pm", "product", "roadmap"],
    "design":               ["design", "ui", "ux", "figma", "product design"],
    "ui ux":                ["ui", "ux", "design", "figma", "user experience"],
    "ui/ux":                ["ui", "ux", "design", "figma", "user experience"],
    "ux":                   ["ux", "user experience", "design", "ui", "figma"],
    "ui":                   ["ui", "ux", "design", "figma", "frontend"],

    # Consulting / Management
    "consulting":           ["consulting", "consultant", "strategy", "management", "advisory"],
    "management":           ["management", "manager", "operations", "strategy"],
    "operations":           ["operations", "ops", "supply chain", "logistics"],

    # Sales / Business Development
    "sales":                ["sales", "business development", "bd", "account management", "revenue"],
    "business development": ["business development", "bd", "sales", "partnerships", "growth"],

    # DevOps / Cloud / Infra
    "devops":               ["devops", "cloud", "aws", "gcp", "azure", "infrastructure", "sre"],
    "cloud":                ["cloud", "aws", "gcp", "azure", "devops", "infrastructure"],
    "cybersecurity":        ["cybersecurity", "security", "infosec", "ethical hacking", "soc"],
    "security":             ["security", "cybersecurity", "infosec", "network security"],
}

# Known Indian cities / regions for location extraction
_KNOWN_LOCATIONS: list[str] = [
    "bangalore", "bengaluru", "mumbai", "delhi", "hyderabad", "chennai",
    "pune", "kolkata", "ahmedabad", "noida", "gurugram", "gurgaon",
    "remote", "work from home", "wfh", "hybrid",
    "new delhi", "ncr", "jaipur", "indore", "chandigarh", "kochi",
    "coimbatore", "lucknow", "nagpur", "surat", "bhopal",
]

# ── LPA extraction ───────────────────────────────────────────────────────────

def _extract_min_lpa(text: str) -> float | None:
    """
    Extract the minimum LPA threshold from text.

    Handles patterns like:
      "above 10 lpa"  → 10.0
      "more than 5 LPA" → 5.0
      "10+ lpa" → 10.0
      "above 15" (no unit) → 15.0
      "10 lakhs" → 10.0
      "500k" → 5.0  (500k INR = 5 LPA)
    """
    lowered = text.lower()

    # Pattern 1: number followed by lpa / lakhs / lakh
    m = re.search(
        r'(\d+(?:\.\d+)?)\s*(?:\+)?\s*(?:lpa|lakhs?|l\.p\.a\.?)',
        lowered
    )
    if m:
        return float(m.group(1))

    # Pattern 2: "X k" salary — treat Xk as annual in INR lakhs (e.g. 600k = 6 LPA)
    m = re.search(r'(\d+(?:\.\d+)?)\s*k\b', lowered)
    if m:
        val = float(m.group(1))
        return round(val / 100, 2)

    # Pattern 3: qualifying word + bare number (above / more than / minimum / min / atleast)
    m = re.search(
        r'(?:above|more\s+than|minimum|min|atleast|at\s+least|over|greater\s+than)\s+(\d+(?:\.\d+)?)',
        lowered
    )
    if m:
        return float(m.group(1))

    return None


# ── Field keyword extraction ─────────────────────────────────────────────────

def _extract_field_keywords(text: str) -> list[str]:
    """
    Match known field phrases in text (longest match wins to avoid partial hits).
    Returns de-duplicated, ordered keyword list.
    """
    lowered = text.lower()
    collected: list[str] = []

    # Sort by phrase length descending so "software engineering" matches before "software"
    sorted_phrases = sorted(FIELD_KEYWORD_MAP.keys(), key=len, reverse=True)
    matched_phrases: set[str] = set()

    for phrase in sorted_phrases:
        pattern = r'\b' + re.escape(phrase) + r'\b'
        if re.search(pattern, lowered):
            # Avoid redundant expansion if a longer phrase already covered this
            already_covered = any(
                phrase in covered for covered in matched_phrases
            )
            if not already_covered:
                matched_phrases.add(phrase)
                for kw in FIELD_KEYWORD_MAP[phrase]:
                    if kw not in collected:
                        collected.append(kw)

    return collected


# ── Location extraction ──────────────────────────────────────────────────────

def _extract_locations(text: str) -> list[str]:
    """Return known location names mentioned in the instruction (case-insensitive)."""
    lowered = text.lower()
    found: list[str] = []
    for loc in sorted(_KNOWN_LOCATIONS, key=len, reverse=True):
        if loc in lowered and loc not in found:
            found.append(loc)
    return found


# ── Public API ───────────────────────────────────────────────────────────────

def parse_instruction(instruction: str) -> dict[str, Any]:
    """
    Parse a student's natural language instruction into a structured intent.

    Returns a dict with keys:
        min_lpa            – float or None
        field_keywords     – list[str] (empty = all fields match)
        preferred_locations – list[str]
        raw_instruction    – original string
    """
    cleaned = instruction.strip()
    return {
        "min_lpa": _extract_min_lpa(cleaned),
        "field_keywords": _extract_field_keywords(cleaned),
        "preferred_locations": _extract_locations(cleaned),
        "raw_instruction": cleaned,
    }


def job_matches_intent(job: dict[str, Any], intent: dict[str, Any]) -> bool:
    """
    Return True if the job satisfies the parsed intent.

    Matching rules:
    1. LPA check  – if min_lpa is set, the job's package must be >= min_lpa.
                    Accepts keys: package_lpa, salary_min, salary (auto-converts
                    raw rupee values > 1000 by dividing by 100_000).
    2. Field check – if field_keywords is non-empty, at least one keyword must
                    appear in the job title or description (case-insensitive).
                    Empty field_keywords means the job passes field check
                    automatically.
    3. Location    – preferred_locations is advisory only; not used to filter
                    here so the agent can still show jobs and rank them.
    """
    # ── LPA check ─────────────────────────────────────────────────────────
    min_lpa: float | None = intent.get("min_lpa")
    if min_lpa is not None:
        raw_pkg = (
            job.get("package_lpa")
            or job.get("salary_min")
            or job.get("salary")
            or 0
        )
        try:
            pkg = float(raw_pkg)
        except (TypeError, ValueError):
            pkg = 0.0
        # Normalise raw rupee values (e.g. 1_000_000 → 10.0 LPA)
        if pkg > 1000:
            pkg = pkg / 100_000
        if pkg < min_lpa:
            return False

    # ── Field keyword check ────────────────────────────────────────────────
    keywords: list[str] = intent.get("field_keywords", [])
    if keywords:
        title: str = (job.get("title") or job.get("role_title") or "").lower()
        description: str = (job.get("description") or "").lower()
        haystack = f"{title} {description}"
        if not any(kw.lower() in haystack for kw in keywords):
            return False

    return True
