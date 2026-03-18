import logging

from openai import OpenAI

from app.config import settings

logger = logging.getLogger(__name__)


def generate_interview_questions(
    job_title: str,
    job_description: str,
    skills: list[str],
    difficulty: str = "medium",
    num_questions: int = 10,
) -> dict:
    """
    Generate interview Q&A using GPT-4o based on the specific JD.
    difficulty: easy | medium | hard
    """
    if not settings.OPENAI_API_KEY:
        logger.warning("No OpenAI API key — returning mock questions")
        return _mock_questions(job_title, skills)

    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    skills_str = ", ".join(skills[:15]) if skills else "general software development"
    prompt = f"""You are an expert technical interviewer. Generate {num_questions} interview questions 
for a {difficulty}-level {job_title} position.

Key skills required: {skills_str}

Job description summary: {job_description[:500]}

For each question provide:
1. The question itself
2. A model answer (2-3 sentences)
3. Category (technical/behavioural/situational)

Format as JSON array:
[
  {{
    \"question\": \"...\",
    \"answer\": \"...\",
    \"category\": \"technical\"
  }}
]

Return ONLY the JSON array, no other text."""

    try:
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=2000,
        )
        import json

        content = response.choices[0].message.content.strip()
        questions = json.loads(content)
        return {"questions": questions, "job_title": job_title, "difficulty": difficulty}
    except Exception as e:
        logger.error(f"OpenAI call failed: {e}")
        return _mock_questions(job_title, skills)


def _mock_questions(job_title: str, skills: list[str]) -> dict:
    """Fallback when OpenAI key is not set."""
    top_skills = skills[:3] if skills else ["Python", "APIs", "databases"]
    return {
        "questions": [
            {
                "question": f"Explain your experience with {top_skills[0]}.",
                "answer": f"Discuss projects where you used {top_skills[0]}, challenges faced, and outcomes.",
                "category": "technical",
            },
            {
                "question": "Describe a challenging project and how you solved it.",
                "answer": "Use the STAR method: Situation, Task, Action, Result.",
                "category": "behavioural",
            },
            {
                "question": f"How would you design a REST API for a {job_title} use case?",
                "answer": "Discuss endpoints, authentication, error handling, and scalability.",
                "category": "technical",
            },
        ],
        "job_title": job_title,
        "difficulty": "medium",
        "note": "Mock questions — add OPENAI_API_KEY for AI-generated questions",
    }
