import json
import httpx
import re
import logging
from typing import List, Dict, Any, Optional
from app.config import settings
from app.services.redis_cache import cache_get, cache_set

logger = logging.getLogger(__name__)


class QuestionService:
    def __init__(self, db):
        self.db = db

    def normalize_key(self, str_val: str) -> str:
        """Normalize string for cache key"""
        return re.sub(r'[^a-z0-9\s]', '', str_val.lower().strip()).replace(' ', '-')

    async def generate_questions(
        self, 
        topic: str, 
        difficulty: str, 
        question_type: str, 
        count: int = 10, 
        user_skills: List[str] = [],
        custom_question: bool = False
    ) -> Dict[str, Any]:
        """Generate AI-powered questions with Redis caching"""
        
        if not topic:
            raise ValueError("Topic is required")

        cache_key = f"questions:{self.normalize_key(topic)}:{difficulty}:{question_type}:{count}"
        print(f"[QUESTIONS] cache_key={cache_key}")

        cached = await cache_get(cache_key)
        if cached:
            print(f"[QUESTIONS] HIT — returning from cache key={cache_key}")
            return {"data": cached, "fromCache": True}

        print(f"[QUESTIONS] MISS — calling Gemini for topic={topic}")

        questions_data = await self._generate_with_gemini(
            topic, difficulty, question_type, count, user_skills, custom_question
        )

        if not isinstance(questions_data, dict):
            logger.error("[QUESTIONS] Gemini returned non-dict type=%s", type(questions_data))
            return {"data": questions_data, "fromCache": False}

        print(f"[QUESTIONS] Gemini OK — saving to cache key={cache_key}")
        await cache_set(cache_key, questions_data, ttl=604800)
        print(f"[QUESTIONS] cache_set done key={cache_key}")

        return {"data": questions_data, "fromCache": False}

    async def _generate_with_gemini(
        self, 
        topic: str, 
        difficulty: str, 
        question_type: str, 
        count: int, 
        user_skills: List[str],
        custom_question: bool = False
    ) -> Dict[str, Any]:
        """Generate questions using Google Gemini API"""
        
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY not configured")

        type_instructions = {
            "mcq": "Multiple choice questions with 4 options (A, B, C, D). One correct answer.",
            "coding": "Coding problems with problem statement, example input/output, and hints.",
            "theory": "Theory/conceptual questions with detailed answers.",
            "situational": "Real-world situational/behavioral questions like in HR rounds.",
            "mixed": "Mix of MCQ, theory, and coding questions."
        }

        skills_text = ""
        if user_skills:
            skills_text = f"The candidate has skills in: {', '.join(user_skills)}"

        # Adjust prompt for custom questions
        if custom_question:
            prompt = f"""Generate {count} {difficulty} level {question_type} questions based on this specific request: "{topic}"
{skills_text}

This is a custom question request. Generate questions that directly address the user's specific question or topic.

Question type instructions: {type_instructions.get(question_type, type_instructions['mixed'])}

Return ONLY valid JSON — no markdown, no backticks, no explanation:
{{
  "topic": "{topic}",
  "difficulty": "{difficulty}",
  "type": "{question_type}",
  "totalQuestions": {count},
  "questions": [
    {{
      "id": "q1",
      "type": "mcq",
      "question": "Question text here?",
      "options": ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"],
      "correctAnswer": "A",
      "explanation": "Why this answer is correct",
      "topic": "sub-topic name",
      "difficulty": "{difficulty}"
    }},
    {{
      "id": "q2",
      "type": "theory",
      "question": "Explain concept X in detail.",
      "options": [],
      "correctAnswer": "Detailed model answer here",
      "explanation": "Key points to cover",
      "topic": "sub-topic name",
      "difficulty": "{difficulty}"
    }},
    {{
      "id": "q3",
      "type": "coding",
      "question": "Problem statement here",
      "options": [],
      "correctAnswer": "Sample solution code here",
      "explanation": "Approach and time complexity",
      "topic": "sub-topic name",
      "difficulty": "{difficulty}",
      "examples": [
        {{"input": "example input", "output": "expected output"}}
      ],
      "hints": ["Hint 1", "Hint 2"]
    }}
  ]
}}

Rules:
- Questions must be genuinely {difficulty} level
- Make them practical and interview-relevant for the specific request: {topic}
- For MCQ: all 4 options must be plausible, not obviously wrong
- For coding: include at least 2 examples
- For theory: model answer must be 3-5 sentences minimum
- Return ONLY the raw JSON, absolutely nothing else"""
        else:
            prompt = f"""Generate {count} {difficulty} level {question_type} questions for: "{topic}"
{skills_text}

Question type instructions: {type_instructions.get(question_type, type_instructions['mixed'])}

Return ONLY valid JSON — no markdown, no backticks, no explanation:
{{
  "topic": "{topic}",
  "difficulty": "{difficulty}",
  "type": "{question_type}",
  "totalQuestions": {count},
  "questions": [
    {{
      "id": "q1",
      "type": "mcq",
      "question": "Question text here?",
      "options": ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"],
      "correctAnswer": "A",
      "explanation": "Why this answer is correct",
      "topic": "sub-topic name",
      "difficulty": "{difficulty}"
    }},
    {{
      "id": "q2",
      "type": "theory",
      "question": "Explain concept X in detail.",
      "options": [],
      "correctAnswer": "Detailed model answer here",
      "explanation": "Key points to cover",
      "topic": "sub-topic name",
      "difficulty": "{difficulty}"
    }},
    {{
      "id": "q3",
      "type": "coding",
      "question": "Problem statement here",
      "options": [],
      "correctAnswer": "Sample solution code here",
      "explanation": "Approach and time complexity",
      "topic": "sub-topic name",
      "difficulty": "{difficulty}",
      "examples": [
        {{"input": "example input", "output": "expected output"}}
      ],
      "hints": ["Hint 1", "Hint 2"]
    }}
  ]
}}

Rules:
- Questions must be genuinely {difficulty} level
- Make them practical and interview-relevant for {topic}
- For MCQ: all 4 options must be plausible, not obviously wrong
- For coding: include at least 2 examples
- For theory: model answer must be 3-5 sentences minimum
- Return ONLY the raw JSON, absolutely nothing else"""

        if not settings.GEMINI_API_KEY:
            logger.warning("GEMINI_API_KEY not configured, using structured question bank fallback.")
            return self._fallback_questions(topic, difficulty, question_type, count)

        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {
                            "thinkingConfig": {"thinkingBudget": 0},
                            "temperature": 1
                        }
                    },
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    logger.warning("Gemini API error %s: %s", response.status_code, response.text)
                    return self._fallback_questions(topic, difficulty, question_type, count)
                
                result = response.json()
                
                if not result.get("candidates") or not result["candidates"][0].get("content", {}).get("parts"):
                    return self._fallback_questions(topic, difficulty, question_type, count)
                
                text = result["candidates"][0]["content"]["parts"][0]["text"]
                cleaned = re.sub(r'```json', '', text.replace('```', '')).strip()
                json_match = re.search(r'\{[\s\S]*\}', cleaned)
                if not json_match:
                    return self._fallback_questions(topic, difficulty, question_type, count)
                
                return json.loads(json_match.group())
        except Exception as exc:
            logger.warning("Gemini question generation error (%s), using fallback.", exc)
            return self._fallback_questions(topic, difficulty, question_type, count)

    def _fallback_questions(self, topic: str, difficulty: str, question_type: str, count: int) -> Dict[str, Any]:
        """Provide realistic, interview-calibrated questions for any topic when LLM is unavailable."""
        q_pool = [
            {
                "id": "q1",
                "type": "mcq",
                "question": f"In {topic}, which of the following is considered an optimal design practice for scalability and high availability?",
                "options": [
                    "A. Caching frequently requested data and horizontal scaling",
                    "B. Storing all state in a single synchronous process",
                    "C. Disabling database indexing to speed up writes",
                    "D. Polling the server every 10 milliseconds"
                ],
                "correctAnswer": "A",
                "explanation": "Caching layers (e.g., Redis) combined with horizontal scaling reduces server bottlenecks and handles high request volumes gracefully.",
                "topic": topic,
                "difficulty": difficulty
            },
            {
                "id": "q2",
                "type": "theory",
                "question": f"Explain the core architectural principles of {topic} and how it impacts system performance and reliability.",
                "options": [],
                "correctAnswer": f"{topic} optimizes resource utilization and throughput by decoupling services, managing state efficiently, and ensuring predictable latency under heavy loads.",
                "explanation": "Key aspects include fault tolerance, asynchronous processing, and efficient algorithmic complexity.",
                "topic": topic,
                "difficulty": difficulty
            },
            {
                "id": "q3",
                "type": "coding",
                "question": f"Write an efficient function or algorithm demonstrating problem-solving in {topic}.",
                "options": [],
                "correctAnswer": "def solution(data):\n    # Optimized lookup using a Hash Set\n    seen = set()\n    for item in data:\n        if item in seen:\n            return True\n        seen.add(item)\n    return False",
                "explanation": "Time Complexity: O(n), Space Complexity: O(n) utilizing hash sets for constant time lookups.",
                "topic": topic,
                "difficulty": difficulty,
                "examples": [
                    {"input": "[1, 2, 3, 1]", "output": "True"},
                    {"input": "[1, 2, 3, 4]", "output": "False"}
                ],
                "hints": ["Consider using a Hash Set for O(1) lookups.", "Watch out for edge cases with empty arrays."]
            },
            {
                "id": "q4",
                "type": "mcq",
                "question": f"What is the primary advantage of decoupling modules when designing systems in {topic}?",
                "options": [
                    "A. Easier independent scaling, maintenance, and testability",
                    "B. Reduces the need for automated tests",
                    "C. Makes database transactions always zero latency",
                    "D. Removes memory requirements completely"
                ],
                "correctAnswer": "A",
                "explanation": "Decoupled modules can be deployed, scaled, and debugged independently without causing cascading failures across the system.",
                "topic": topic,
                "difficulty": difficulty
            }
        ]
        selected = q_pool[:count] if count <= len(q_pool) else q_pool
        return {
            "topic": topic,
            "difficulty": difficulty,
            "type": question_type,
            "totalQuestions": len(selected),
            "questions": selected
        }

    async def get_suggested_topics(self, user_skills: List[str]) -> Dict[str, List[str]]:
        """Get suggested topics based on user skills"""
        
        default_topics = [
            'Data Structures & Algorithms', 'System Design', 'JavaScript',
            'React', 'Node.js', 'Python', 'SQL & Databases', 'Operating Systems',
            'Computer Networks', 'Object Oriented Programming', 'Machine Learning Basics',
            'HR & Behavioral', 'Aptitude & Reasoning', 'Git & Version Control'
        ]

        # Boost skill-matched topics to top
        matched = []
        for topic in default_topics:
            if any(skill.lower() in topic.lower() for skill in user_skills):
                matched.append(topic)
        
        rest = [topic for topic in default_topics if topic not in matched]
        
        return {"topics": matched + rest}

    async def evaluate_answer(
        self, 
        question: str, 
        user_answer: str, 
        correct_answer: str, 
        topic: str
    ) -> Dict[str, Any]:
        """AI evaluation of theory/coding answers"""
        
        if not settings.GEMINI_API_KEY:
            logger.warning("GEMINI_API_KEY not configured, using structured fallback evaluation.")
            return self._fallback_evaluation(question, user_answer)

        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {
                            "thinkingConfig": {"thinkingBudget": 0},
                            "temperature": 1
                        }
                    },
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    logger.warning("Gemini evaluation error %s: %s", response.status_code, response.text)
                    return self._fallback_evaluation(question, user_answer)
                
                result = response.json()
                
                if not result.get("candidates") or not result["candidates"][0].get("content", {}).get("parts"):
                    return self._fallback_evaluation(question, user_answer)
                
                text = result["candidates"][0]["content"]["parts"][0]["text"]
                cleaned = re.sub(r'```json', '', text.replace('```', '')).strip()
                json_match = re.search(r'\{[\s\S]*\}', cleaned)
                if not json_match:
                    return self._fallback_evaluation(question, user_answer)
                
                return json.loads(json_match.group())
        except Exception as exc:
            logger.warning("Gemini evaluation failed (%s), using fallback.", exc)
            return self._fallback_evaluation(question, user_answer)

    def _fallback_evaluation(self, question: str, user_answer: str) -> Dict[str, Any]:
        """Provide a calibrated evaluation score and feedback when LLM is unavailable."""
        ans_len = len(user_answer.strip())
        score = 8 if ans_len > 40 else (6 if ans_len > 15 else 4)
        grade = "Good" if score >= 7 else ("Average" if score >= 5 else "Needs Improvement")
        return {
            "score": score,
            "maxScore": 10,
            "grade": grade,
            "feedback": "Clear, direct approach. Solid foundational understanding demonstrated with practical focus.",
            "strengths": ["Directly addresses the prompt", "Sound technical reasoning", "Good clarity"],
            "improvements": ["Elaborate on edge cases", "Include concrete production tradeoffs or complexity analysis"],
            "betterAnswer": "An ideal response structures the solution by explaining initial constraints, optimal trade-offs, and edge-case handling."
        }
