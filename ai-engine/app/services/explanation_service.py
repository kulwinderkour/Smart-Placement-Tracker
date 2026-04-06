from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

_tokenizer = None
_model = None


def _load_flan_model() -> tuple[Any, Any]:
    global _tokenizer, _model

    if _tokenizer is not None and _model is not None:
        return _tokenizer, _model

    try:
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
    except Exception as exc:  # pragma: no cover
        raise RuntimeError(
            "transformers is required for explanation generation. "
            "Install dependency: transformers"
        ) from exc

    model_name = "google/flan-t5-base"
    _tokenizer = AutoTokenizer.from_pretrained(model_name)
    _model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
    return _tokenizer, _model


def _template_explanation(payload: dict[str, Any]) -> str:
    role = payload["job_role"]
    profile_match_pct = payload.get("profile_match_pct")
    role_match = payload.get("role_match")
    matched = payload.get("matched_skills") or []
    missing = payload.get("missing_skills") or []

    if payload["match"]:
        skills_text = ", ".join(matched[:6]) if matched else "relevant technical skills"
        return (
            f"The candidate appears suitable for the {role} role. "
            f"The profile match score is {profile_match_pct}%, and the resume demonstrates {skills_text}. "
            "This combination indicates the candidate can contribute effectively to the role's core responsibilities."
        )

    if missing:
        missing_text = ", ".join(missing[:6])
        return (
            f"The candidate is currently a weaker fit for the {role} role. "
            f"The profile match score is {profile_match_pct}%, and key required skills are missing, including {missing_text}. "
            "With targeted upskilling in these areas, the candidate could improve suitability."
        )

    return (
        f"The candidate is currently not a strong match for the {role} role. "
        f"Role alignment status is {role_match}, which does not align closely enough with the target role requirements."
    )


def generate_explanation(payload: dict[str, Any]) -> str:
    prompt = (
        "Write a concise placement assessment paragraph (4-5 sentences).\n"
        "Mention role alignment and skill evidence clearly.\n"
        "Use a professional and objective tone.\n\n"
        f"Target role: {payload['job_role']}\n"
        f"Role match: {payload.get('role_match')}\n"
        f"Profile match percentage: {payload.get('profile_match_pct')}\n"
        f"Match decision: {payload['match']}\n"
        f"Matched skills: {', '.join(payload.get('matched_skills', [])) or 'None'}\n"
        f"Missing skills: {', '.join(payload.get('missing_skills', [])) or 'None'}"
    )

    try:
        tokenizer, model = _load_flan_model()
        inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=768)
        outputs = model.generate(
            **inputs,
            max_new_tokens=160,
            temperature=0.7,
            do_sample=True,
            top_p=0.92,
        )
        text = tokenizer.decode(outputs[0], skip_special_tokens=True).strip()
        if text:
            return text
    except Exception as exc:  # pragma: no cover
        logger.warning("Flan explanation generation failed, using template fallback: %s", exc)

    return _template_explanation(payload)
