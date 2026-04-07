import json
import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


async def generate_interview_questions(
    job_title: str,
    job_description: str,
    skills: list[str],
    difficulty: str = "medium",
    num_questions: int = 10,
    question_type: str = "mcq",
) -> dict:
    """
    Generate interview Q&A using Gemini.
    difficulty: easy | medium | hard
    question_type: mcq | theory | coding | situational | mixed
    """
    if not settings.GEMINI_API_KEY:
        logger.warning("No Gemini API key — returning mock questions")
        return _mock_questions(job_title, skills, num_questions, question_type)

    skills_str = ", ".join(skills[:15]) if skills else job_title

    if question_type == "mcq" or question_type == "mixed":
        prompt = f"""You are an expert technical interviewer preparing a {difficulty}-level practice test.

Topic: {job_title}
Key concepts/skills: {skills_str}

Generate exactly {num_questions} multiple-choice questions (MCQ) strictly about "{job_title}".
Each question must have exactly 4 options (A, B, C, D) and test real technical knowledge of the topic.
Do NOT include behavioural or HR questions.

Return ONLY a valid JSON array — no markdown, no explanation:
[
  {{
    "question": "What is the time complexity of binary search?",
    "options": ["A. O(n)", "B. O(log n)", "C. O(n²)", "D. O(1)"],
    "correct_answer": "B",
    "explanation": "Binary search halves the search space each step, giving O(log n).",
    "category": "mcq"
  }}
]"""
    elif question_type == "coding":
        prompt = f"""You are an expert technical interviewer.

Topic: {job_title}
Skills: {skills_str}
Difficulty: {difficulty}

Generate exactly {num_questions} coding/problem-solving questions strictly about "{job_title}".
Each must include the problem statement, sample input/output, and a model solution approach.

Return ONLY a valid JSON array:
[
  {{
    "question": "Write a function to reverse a linked list.",
    "answer": "Iterate through nodes, reversing the next pointer at each step. Time: O(n), Space: O(1).",
    "explanation": "Use three pointers: prev, curr, next to reverse in-place.",
    "category": "coding"
  }}
]"""
    else:
        prompt = f"""You are an expert technical interviewer.

Topic: {job_title}
Skills: {skills_str}
Difficulty: {difficulty}
Question type: {question_type}

Generate exactly {num_questions} {question_type} questions strictly about "{job_title}".
Do NOT include generic HR or experience questions. Focus on technical depth.

Return ONLY a valid JSON array:
[
  {{
    "question": "...",
    "answer": "...",
    "explanation": "...",
    "category": "{question_type}"
  }}
]"""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                url,
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "temperature": 0.4,
                    },
                },
            )

        if response.status_code != 200:
            raise Exception(f"Gemini API error: {response.status_code} - {response.text}")


        result = response.json()
        text = result["candidates"][0]["content"]["parts"][0]["text"]
        cleaned = text.replace("```json", "").replace("```", "").strip()

        import re
        match = re.search(r'\[[\s\S]*\]', cleaned)
        if not match:
            raise Exception("Could not parse JSON array from Gemini response")

        questions = json.loads(match.group())

        if question_type == "mcq" or question_type == "mixed":
            valid = []
            for q in questions:
                opts = q.get("options")
                if isinstance(opts, list) and len(opts) >= 2:
                    q["category"] = "mcq"
                    valid.append(q)
            if not valid:
                logger.warning("Gemini returned no valid MCQs — using mock")
                return _mock_questions(job_title, skills, num_questions, question_type)
            if len(valid) < num_questions:
                gap = _mock_questions(job_title, skills, num_questions - len(valid), question_type)
                valid.extend(gap["questions"])
            questions = valid[:num_questions]

        return {"questions": questions, "job_title": job_title, "difficulty": difficulty, "type": question_type}
    except Exception as e:
        logger.error(f"Gemini call failed: {e}")
        return _mock_questions(job_title, skills, num_questions, question_type)


def _mock_questions(job_title: str, skills: list[str], num_questions: int = 10, question_type: str = "mcq") -> dict:
    """Topic-specific fallback questions when Gemini is unavailable."""
    topic = job_title
    base_mcqs = [
        {
            "question": f"What is the primary purpose of {topic}?",
            "options": [f"A. To solve {topic} problems efficiently", "B. To manage databases", "C. To design user interfaces", "D. To handle network requests"],
            "correct_answer": "A",
            "explanation": f"{topic} is primarily used to solve specific computational problems efficiently.",
            "category": "mcq",
        },
        {
            "question": f"Which of the following is a core concept in {topic}?",
            "options": ["A. Memory management", f"B. Core algorithms specific to {topic}", "C. CSS styling", "D. HTTP requests"],
            "correct_answer": "B",
            "explanation": f"Core algorithms are fundamental to understanding {topic}.",
            "category": "mcq",
        },
        {
            "question": f"What is the time complexity of a common {topic} operation?",
            "options": ["A. O(1)", "B. O(n)", "C. O(log n)", "D. Depends on the specific algorithm"],
            "correct_answer": "D",
            "explanation": "Time complexity varies by algorithm and implementation in most topics.",
            "category": "mcq",
        },
        {
            "question": f"Which approach is best for optimizing {topic} performance?",
            "options": ["A. Brute force", "B. Dynamic programming", "C. Greedy algorithms", "D. It depends on the problem constraints"],
            "correct_answer": "D",
            "explanation": "The best approach depends on problem constraints and requirements.",
            "category": "mcq",
        },
        {
            "question": f"In {topic}, what does space complexity refer to?",
            "options": ["A. Amount of memory used", "B. Number of lines of code", "C. Execution speed", "D. Number of function calls"],
            "correct_answer": "A",
            "explanation": "Space complexity measures the amount of memory an algorithm uses.",
            "category": "mcq",
        },
    ]
    # Repeat/extend to reach num_questions (deep copy so shared dicts are not mutated)
    import math, copy
    repeated = [copy.deepcopy(q) for q in (base_mcqs * math.ceil(num_questions / len(base_mcqs)))[:num_questions]]
    for i, q in enumerate(repeated):
        q["question"] = f"Q{i+1}: " + q["question"]
    return {
        "questions": repeated,
        "job_title": job_title,
        "difficulty": "medium",
        "type": question_type,
    }
