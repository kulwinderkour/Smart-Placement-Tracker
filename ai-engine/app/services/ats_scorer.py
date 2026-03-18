import logging
import re
from typing import Optional

logger = logging.getLogger(__name__)


def score_keyword_density(resume_skills: list[str], jd_skills: list[str]) -> float:
    """30% weight — how many JD skills appear in the resume."""
    if not jd_skills:
        return 0.5
    jd_lower = [s.lower() for s in jd_skills]
    resume_lower = [s.lower() for s in resume_skills]
    matched = sum(1 for s in jd_lower if s in resume_lower)
    return matched / len(jd_lower)


def score_section_completeness(text: str) -> float:
    """25% weight — presence of key resume sections."""
    sections = {
        "experience": r"\b(experience|work history|employment)\b",
        "education": r"\b(education|degree|university|college|bachelor|master)\b",
        "projects": r"\b(projects|portfolio|built|developed|created)\b",
        "skills": r"\b(skills|technologies|tech stack|proficient)\b",
        "contact": r"\b(email|phone|linkedin|github|contact)\b",
    }
    text_lower = text.lower()
    found = sum(1 for pattern in sections.values() if re.search(pattern, text_lower))
    return found / len(sections)


def score_formatting(text: str) -> float:
    """20% weight — clean text structure (no table artifacts, proper headings)."""
    score = 1.0
    # Penalize table artifacts (lots of | characters)
    if text.count("|") > 20:
        score -= 0.3
    # Penalize very long lines (copy-paste formatting issues)
    lines = text.split("\n")
    long_lines = sum(1 for line in lines if len(line) > 200)
    if long_lines > 10:
        score -= 0.2
    # Reward multiple distinct sections (newlines between sections)
    if text.count("\n\n") > 5:
        score += 0.1
    return max(0.0, min(1.0, score))


def score_quantified_achievements(text: str) -> float:
    """15% weight — numbers and percentages in bullet points."""
    patterns = [
        r"\d+%",  # percentages
        r"\$\d+",  # dollar amounts
        r"\d+\+",  # "10+ years"
        r"increased by \d+",
        r"reduced by \d+",
        r"\d+ (users|customers|projects|teams|members)",
    ]
    found = sum(1 for p in patterns if re.search(p, text, re.IGNORECASE))
    return min(1.0, found / 3)


def score_length(text: str) -> float:
    """10% weight — ideal word count for fresher: 400-800 words."""
    word_count = len(text.split())
    if 400 <= word_count <= 800:
        return 1.0
    elif 300 <= word_count < 400 or 800 < word_count <= 1000:
        return 0.7
    elif 200 <= word_count < 300 or 1000 < word_count <= 1200:
        return 0.4
    return 0.2


def compute_ats_score(
    resume_text: str,
    resume_skills: list[str],
    jd_skills: Optional[list[str]] = None,
) -> dict:
    """
    Returns a score 0-100 and per-dimension breakdown.
    """
    if jd_skills is None:
        jd_skills = []

    keyword_score = score_keyword_density(resume_skills, jd_skills)
    section_score = score_section_completeness(resume_text)
    format_score = score_formatting(resume_text)
    achieve_score = score_quantified_achievements(resume_text)
    length_score = score_length(resume_text)

    # Weighted total
    total = (
        keyword_score * 0.30
        + section_score * 0.25
        + format_score * 0.20
        + achieve_score * 0.15
        + length_score * 0.10
    )

    ats_score = round(total * 100)

    suggestions = []
    if keyword_score < 0.5:
        suggestions.append("Add more skills from the job description to your resume.")
    if section_score < 0.6:
        suggestions.append(
            "Make sure your resume has clear sections: Experience, Education, Projects, Skills."
        )
    if format_score < 0.7:
        suggestions.append("Avoid tables and complex formatting — ATS systems struggle with them.")
    if achieve_score < 0.4:
        suggestions.append(
            "Add numbers to your achievements, e.g. 'Improved performance by 30%'."
        )
    if length_score < 0.5:
        suggestions.append("Aim for 400-800 words for a fresher resume.")

    return {
        "ats_score": ats_score,
        "breakdown": {
            "keyword_match": round(keyword_score * 100),
            "sections": round(section_score * 100),
            "formatting": round(format_score * 100),
            "achievements": round(achieve_score * 100),
            "length": round(length_score * 100),
        },
        "suggestions": suggestions,
    }
