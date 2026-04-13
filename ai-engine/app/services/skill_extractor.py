import json
import logging
import re
from pathlib import Path

logger = logging.getLogger(__name__)

# Load spaCy model once at startup
try:
    import spacy  # type: ignore
    try:
        nlp = spacy.load("en_core_web_sm")
    except OSError:
        # Optional dependency: we still support taxonomy-only matching without the model.
        logger.warning("spaCy model not found — continuing with taxonomy-only skill extraction")
        nlp = None
except Exception:
    # spaCy itself is optional for the app to run.
    logger.warning("spaCy not available — continuing with taxonomy-only skill extraction")
    nlp = None

# Load skills taxonomy
TAXONOMY_PATH = Path("app/data/skills_taxonomy.json")


def load_taxonomy() -> dict:
    try:
        with open(TAXONOMY_PATH) as f:
            return json.load(f)
    except FileNotFoundError:
        logger.error(f"Taxonomy not found at {TAXONOMY_PATH}")
        return {"skills": [], "categories": {}}


taxonomy = load_taxonomy()
KNOWN_SKILLS = {s.lower(): s for s in taxonomy.get("skills", [])}
CATEGORIES = taxonomy.get("categories", {})


def get_skill_category(skill: str) -> str:
    for category, skills in CATEGORIES.items():
        if skill in [s.lower() for s in skills]:
            return category
    return "other"


def extract_skills_from_text(text: str) -> list[dict]:
    """
    Extract skills from text using two methods:
    1. Exact match against skills taxonomy (case-insensitive)
    2. spaCy NER for any missed technical terms
    Returns list of dicts: {name, category}
    """
    found_skills = {}
    text_lower = text.lower()

    # Method 1 — taxonomy matching
    for skill_lower, skill_original in KNOWN_SKILLS.items():
        # Use word boundary matching to avoid partial matches
        pattern = r"\b" + re.escape(skill_lower) + r"\b"
        if re.search(pattern, text_lower):
            found_skills[skill_lower] = {
                "name": skill_original,
                "category": get_skill_category(skill_lower),
            }

    # Method 2 — spaCy NER for additional terms
    if nlp:
        doc = nlp(text[:10000])  # limit to 10k chars for performance
        for ent in doc.ents:
            ent_lower = ent.text.lower().strip()
            if ent_lower in KNOWN_SKILLS and ent_lower not in found_skills:
                found_skills[ent_lower] = {
                    "name": KNOWN_SKILLS[ent_lower],
                    "category": get_skill_category(ent_lower),
                }

    return list(found_skills.values())
