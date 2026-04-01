import json
import httpx
import re
from typing import List, Dict, Any, Optional
from app.config import settings


class QuestionService:
    def __init__(self, db):
        self.db = db

    def normalize_key(self, str_val: str) -> str:
        """Normalize string for cache key"""
        import re
        return re.sub(r'[^a-z0-9\s]', '', str_val.lower().strip()).replace(r'\s+', '-')

    async def _get_redis_client(self):
        """Get Redis client for caching"""
        try:
            import redis
            # Try to connect to Redis (assuming it's configured in settings)
            redis_client = redis.Redis(
                host=settings.REDIS_URL.split('://')[1].split(':')[0] if ':' in settings.REDIS_URL else 'localhost',
                port=int(settings.REDIS_URL.split(':')[-1]) if ':' in settings.REDIS_URL else 6379,
                decode_responses=True
            )
            return redis_client
        except Exception as e:
            print(f"Redis connection failed: {e}")
            return None

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
        
        # Try to get from cache
        redis_client = await self._get_redis_client()
        if redis_client:
            try:
                cached = redis_client.get(cache_key)
                if cached:
                    print(f"Cache HIT: {cache_key}")
                    return {"data": json.loads(cached), "fromCache": True}
            except Exception as e:
                print(f"Cache get error: {e}")

        print(f"Cache MISS — calling Gemini for: {topic}")
        
        # Generate questions using Gemini
        questions_data = await self._generate_with_gemini(
            topic, difficulty, question_type, count, user_skills, custom_question
        )

        # Cache for 7 days (604800 seconds)
        if redis_client:
            try:
                redis_client.setex(cache_key, 604800, json.dumps(questions_data))
                print(f"Saved to cache: {cache_key}")
            except Exception as e:
                print(f"Cache set error: {e}")

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

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key={settings.GEMINI_API_KEY}"
        
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
                timeout=90.0
            )
            
            if response.status_code != 200:
                raise Exception(f"Gemini API error: {response.status_code} - {response.text}")
            
            result = response.json()
            
            if not result.get("candidates") or not result["candidates"][0].get("content", {}).get("parts"):
                raise Exception("Invalid response from Gemini API")
            
            text = result["candidates"][0]["content"]["parts"][0]["text"]
            
            # Clean and parse JSON
            cleaned = re.sub(r'```json', '', text.replace('```', '')).strip()
            
            # Extract JSON from response
            json_match = re.search(r'\{[\s\S]*\}', cleaned)
            if not json_match:
                raise Exception("Could not parse JSON from Gemini response")
            
            questions_data = json.loads(json_match.group())
            return questions_data

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
            raise ValueError("GEMINI_API_KEY not configured")

        prompt = f"""You are an expert interviewer evaluating a candidate's answer.

Question: {question}
Topic: {topic}
Model Answer: {correct_answer}
Candidate's Answer: {user_answer}

Return ONLY valid JSON:
{{
  "score": 7,
  "maxScore": 10,
  "grade": "Good",
  "feedback": "Detailed feedback on what was good and what was missing",
  "strengths": ["Point 1", "Point 2"],
  "improvements": ["Missing point 1", "Missing point 2"],
  "betterAnswer": "A more complete version of the answer"
}}

Scoring: 0-4 = Poor, 5-6 = Average, 7-8 = Good, 9-10 = Excellent
Return ONLY the raw JSON."""

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key={settings.GEMINI_API_KEY}"
        
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
                timeout=90.0
            )
            
            if response.status_code != 200:
                raise Exception(f"Gemini API error: {response.status_code} - {response.text}")
            
            result = response.json()
            
            if not result.get("candidates") or not result["candidates"][0].get("content", {}).get("parts"):
                raise Exception("Invalid response from Gemini API")
            
            text = result["candidates"][0]["content"]["parts"][0]["text"]
            
            # Clean and parse JSON
            cleaned = re.sub(r'```json', '', text.replace('```', '')).strip()
            
            # Extract JSON from response
            json_match = re.search(r'\{[\s\S]*\}', cleaned)
            if not json_match:
                raise Exception("Could not parse JSON from Gemini response")
            
            evaluation_data = json.loads(json_match.group())
            return evaluation_data
