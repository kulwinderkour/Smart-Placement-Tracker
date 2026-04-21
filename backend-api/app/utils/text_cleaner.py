"""
Production text cleaning & language normalization for scraped job content.

Pipeline:
    raw_html -> strip_html -> decode_entities -> collapse_ws
             -> detect_lang -> (optional) translate_to_en
             -> truncate (by word boundary)

Why each choice:
  - `bleach.clean(strip=True)`  : battle-tested HTML sanitizer (used by Mozilla, Instagram),
                                   handles malformed markup gracefully. Regex can't parse HTML.
  - `html.unescape`             : decodes &amp; &nbsp; &#39; etc. cleanly.
  - `langdetect`                : fast, zero-infra language detection (port of Google's lib).
  - `deep-translator`           : free wrappers around Google/MyMemory for production
                                   translate calls. Swap for Cloud Translation API under load.
"""
from __future__ import annotations

import html
import logging
import re
from functools import lru_cache
from typing import Optional

import bleach

logger = logging.getLogger(__name__)

# Collapse any run of whitespace (incl. newlines from stripped <p>, <br>) to a single space.
_WS_RE = re.compile(r"\s+")

# Don't allow ANY tags through — we want plain text for card previews.
# If you ever want safe rich HTML (bold/italic/links), switch strip=False and whitelist tags.
_ALLOWED_TAGS: list[str] = []
_ALLOWED_ATTRS: dict = {}


def strip_html(raw: Optional[str]) -> str:
    """Remove all HTML tags + decode entities. Returns clean plaintext."""
    if not raw:
        return ""
    # 1. bleach handles malformed/partial tags safely (critical: our current DB has broken ones)
    text = bleach.clean(raw, tags=_ALLOWED_TAGS, attributes=_ALLOWED_ATTRS, strip=True)
    # 2. decode entities (&amp; &nbsp; etc.) — bleach preserves them
    text = html.unescape(text)
    # 3. collapse whitespace
    text = _WS_RE.sub(" ", text).strip()
    return text


def truncate_at_word(text: str, max_len: int = 220, ellipsis: str = "…") -> str:
    """Truncate to `max_len` chars at a word boundary. Never slice mid-word."""
    if not text or len(text) <= max_len:
        return text
    slice_ = text[:max_len].rsplit(" ", 1)[0]
    return f"{slice_}{ellipsis}"


@lru_cache(maxsize=2048)
def detect_language(text: str) -> str:
    """Return ISO-639-1 code ('en', 'de', 'fr', ...) or 'unknown'. LRU-cached."""
    if not text or len(text) < 20:
        return "unknown"
    try:
        # Lazy import — langdetect seeds a RNG per process which we don't want at module load.
        from langdetect import detect, DetectorFactory

        DetectorFactory.seed = 0  # deterministic results
        return detect(text[:500])  # sample first 500 chars — plenty for detection
    except Exception as e:
        logger.debug("langdetect failed: %s", e)
        return "unknown"


@lru_cache(maxsize=512)
def translate_to_english(text: str, source: str = "auto") -> str:
    """
    Translate text to English. Cached because many scraped postings repeat boilerplate.

    Swap `GoogleTranslator` for `google.cloud.translate_v2` if you need SLA & quota guarantees.
    deep-translator is fine for <1k req/day free.
    """
    if not text:
        return text
    try:
        from deep_translator import GoogleTranslator

        return GoogleTranslator(source=source, target="en").translate(text[:4500])
    except Exception as e:
        logger.warning("translation failed (%s): %s — returning original", source, e)
        return text


def normalize_description(
    raw: Optional[str],
    *,
    max_len: int = 220,
    translate_non_english: bool = False,
) -> tuple[str, str]:
    """
    Full clean pipeline for a job description.

    Returns (clean_text, detected_lang).

    Order matters: strip HTML FIRST (so language detection sees real words,
    not tag names), THEN detect, THEN optionally translate, THEN truncate.
    """
    text = strip_html(raw)
    if not text:
        return "", "unknown"

    lang = detect_language(text)

    if translate_non_english and lang not in ("en", "unknown"):
        text = translate_to_english(text, source=lang)

    return truncate_at_word(text, max_len=max_len), lang


def fallback(value: Optional[str], default: str = "Not listed") -> str:
    """Consistent fallback for missing fields (salary, location, etc.)."""
    v = (value or "").strip()
    return v if v else default
