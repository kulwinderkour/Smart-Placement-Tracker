"""
Intent Agent - Parses natural language instructions using Gemini 2.5 Flash.

Extracts:
- role (job title/field)
- salary range (min/max LPA)
- location
- constraints (remote/hybrid/full-time)
- experience level

Handles English, Hindi, and Hinglish instructions.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from app.core.gemini_client import GeminiClient, GeminiModel, get_gemini_client
from app.core.agent_logger import AgentLogger, AgentType
from app.agent.intent_parser import parse_instruction as fallback_parse

logger = logging.getLogger(__name__)


@dataclass
class ParsedIntent:
    """Structured intent from user instruction."""
    role: str | None = None
    field_keywords: list[str] | None = None
    salary_min_lpa: float | None = None
    salary_max_lpa: float | None = None
    location: str | None = None
    work_mode: str | None = None  # remote/hybrid/onsite
    job_type: str | None = None   # full_time/intern/contract
    experience_years: int | None = None
    constraints: list[str] | None = None
    raw_instruction: str = ""
    confidence: float = 0.0  # 0-1 confidence score
    parsed_by: str = "gemini"  # gemini | fallback


class IntentAgent:
    """
    Gemini 2.5 Flash powered intent parser.
    
    Falls back to rule-based parser if Gemini fails.
    """
    
    # Schema for structured JSON output
    INTENT_SCHEMA = {
        "type": "object",
        "properties": {
            "role": {"type": ["string", "null"], "description": "Job role or field (e.g., 'software engineer', 'data scientist')"},
            "salary_min_lpa": {"type": ["number", "null"], "description": "Minimum salary in LPA (Lakhs Per Annum)"},
            "salary_max_lpa": {"type": ["number", "null"], "description": "Maximum salary in LPA"},
            "location": {"type": ["string", "null"], "description": "City or 'remote'"},
            "work_mode": {"type": ["string", "null"], "enum": ["remote", "hybrid", "onsite", None], "description": "Work arrangement"},
            "job_type": {"type": ["string", "null"], "enum": ["full_time", "intern", "contract", None], "description": "Employment type"},
            "experience_years": {"type": ["integer", "null"], "description": "Years of experience required"},
            "constraints": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Additional constraints like 'immediate joining', 'Bangalore only'"
            }
        },
        "required": ["role", "salary_min_lpa", "salary_max_lpa", "location", "work_mode", "job_type", "experience_years", "constraints"]
    }
    
    SYSTEM_PROMPT = """You are an intent parsing assistant for a job placement platform.

Parse the user's natural language instruction and extract structured job search criteria.

Instructions may be in:
- English: "Apply to software engineering jobs above 10 LPA in Bangalore"
- Hindi: "10 LPA से अधिक सॉफ्टवेयर इंजीनियरिंग नौकरियाँ"
- Hinglish: "software engineer job chahiye 8 LPA ke upar Bangalore mein"

Extract these fields:
1. role: The job role or field (e.g., "software engineer", "data scientist", "product manager")
2. salary_min_lpa: Minimum salary in LPA (Lakhs Per Annum). Infer from phrases like:
   - "above 10 LPA" → 10
   - "8 LPA se upar" → 8
   - "10 से अधिक" → 10
   - "more than 12" → 12
   - "minimum 15" → 15
3. salary_max_lpa: Maximum salary if specified (e.g., "below 20 LPA", "20 tak")
4. location: City name or "remote" / "work from home"
5. work_mode: "remote", "hybrid", or "onsite"
6. job_type: "full_time", "intern", or "contract"
7. experience_years: Years of experience if specified
8. constraints: List of additional constraints

Return NULL for fields not mentioned. Be conservative - only extract what's explicitly stated."""
    
    def __init__(self):
        self.client = get_gemini_client(model=GeminiModel.FLASH, temperature=0.1)
    
    async def parse(self, instruction: str, agent_logger: AgentLogger | None = None) -> ParsedIntent:
        """
        Parse user instruction into structured intent.
        
        Args:
            instruction: Natural language instruction
            agent_logger: Optional logger for tracking
            
        Returns:
            ParsedIntent with all extracted fields
        """
        if agent_logger:
            agent_logger.log_started(
                AgentType.INTENT,
                "parse_instruction",
                {"instruction": instruction[:200]},
                {"instruction_length": len(instruction)}
            )
        
        try:
            # Try Gemini first
            parsed = await self._parse_with_gemini(instruction)
            
            if parsed.confidence > 0.5:
                if agent_logger:
                    agent_logger.log_success(
                        AgentType.INTENT,
                        "parse_instruction",
                        {"parsed": parsed.__dict__},
                        {"confidence": parsed.confidence, "parser": "gemini"}
                    )
                return parsed
            
            # Low confidence - fallback to rule-based
            logger.warning(f"Low Gemini confidence ({parsed.confidence}), using fallback parser")
            
        except Exception as e:
            logger.warning(f"Gemini parsing failed: {e}, using fallback")
            if agent_logger:
                agent_logger.log_retry(AgentType.INTENT, "parse_instruction", 1, e)
        
        # Fallback to rule-based parser
        fallback_result = self._parse_with_fallback(instruction)
        
        if agent_logger:
            agent_logger.log_success(
                AgentType.INTENT,
                "parse_instruction",
                {"parsed": fallback_result.__dict__},
                {"parser": "fallback"}
            )
        
        return fallback_result
    
    async def _parse_with_gemini(self, instruction: str) -> ParsedIntent:
        """Parse using Gemini 2.5 Flash."""
        
        response = await self.client.generate(
            prompt=instruction,
            system_prompt=self.SYSTEM_PROMPT,
            output_schema=self.INTENT_SCHEMA
        )
        
        if not response.success or not response.structured_output:
            raise ValueError(f"Gemini failed: {response.error}")
        
        data = response.structured_output
        
        # Calculate confidence based on filled fields
        filled_fields = sum([
            data.get("role") is not None,
            data.get("salary_min_lpa") is not None,
            data.get("location") is not None,
        ])
        confidence = filled_fields / 3  # 0-1 based on key fields
        
        # Convert to field keywords for job filtering
        field_keywords = self._extract_field_keywords(data.get("role", ""))
        
        return ParsedIntent(
            role=data.get("role"),
            field_keywords=field_keywords,
            salary_min_lpa=data.get("salary_min_lpa"),
            salary_max_lpa=data.get("salary_max_lpa"),
            location=data.get("location"),
            work_mode=data.get("work_mode"),
            job_type=data.get("job_type"),
            experience_years=data.get("experience_years"),
            constraints=data.get("constraints") or [],
            raw_instruction=instruction,
            confidence=confidence,
            parsed_by="gemini"
        )
    
    def _parse_with_fallback(self, instruction: str) -> ParsedIntent:
        """Parse using existing rule-based parser."""
        
        fallback = fallback_parse(instruction)
        
        # Map fallback fields to ParsedIntent
        salary_min = fallback.get("min_lpa")
        is_max_only = any(kw in instruction.lower() for kw in ['below', 'under', 'less than', 'max'])
        
        if is_max_only and salary_min:
            salary_max = salary_min
            salary_min = 0
        else:
            salary_max = None
        
        return ParsedIntent(
            role=None,  # Fallback doesn't extract role separately
            field_keywords=fallback.get("field_keywords", []),
            salary_min_lpa=salary_min,
            salary_max_lpa=salary_max,
            location=fallback.get("preferred_locations", [None])[0] if fallback.get("preferred_locations") else None,
            work_mode=None,
            job_type=None,
            experience_years=None,
            constraints=[],
            raw_instruction=instruction,
            confidence=0.5,  # Moderate confidence for fallback
            parsed_by="fallback"
        )
    
    def _extract_field_keywords(self, role: str | None) -> list[str]:
        """Extract field keywords from role string."""
        if not role:
            return []
        
        role_lower = role.lower()
        keywords = []
        
        # Map common roles to keywords
        keyword_map = {
            "software": ["software", "sde", "developer", "backend", "frontend", "fullstack"],
            "sde": ["software", "sde", "developer"],
            "data scientist": ["data science", "ml", "machine learning", "python"],
            "data science": ["data science", "ml", "machine learning"],
            "machine learning": ["ml", "ai", "deep learning"],
            "product manager": ["product", "pm", "roadmap"],
            "frontend": ["frontend", "react", "angular", "vue"],
            "backend": ["backend", "api", "server"],
            "fullstack": ["fullstack", "frontend", "backend"],
            "devops": ["devops", "cloud", "aws", "docker"],
            "mobile": ["mobile", "ios", "android", "flutter"],
        }
        
        for key, words in keyword_map.items():
            if key in role_lower:
                keywords.extend(words)
        
        # Add role words themselves
        keywords.extend(role_lower.split())
        
        # Deduplicate
        return list(set(keywords))


# Singleton instance
_intent_agent: IntentAgent | None = None


def get_intent_agent() -> IntentAgent:
    """Get or create IntentAgent singleton."""
    global _intent_agent
    if _intent_agent is None:
        _intent_agent = IntentAgent()
    return _intent_agent


async def parse_intent(instruction: str, agent_logger: AgentLogger | None = None) -> ParsedIntent:
    """Convenience function for parsing intent."""
    agent = get_intent_agent()
    return await agent.parse(instruction, agent_logger)
