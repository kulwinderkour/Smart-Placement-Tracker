"""
Resume Intelligence Agent

Extracts structured information from resume text using Gemini:
- Skills (with normalization)
- Projects (name, tech stack, description)
- Education (institution, degree, year, CGPA)
- Experience (company, role, duration, description)

Integrates with skill taxonomy for normalization.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from app.core.gemini_client import GeminiClient, GeminiModel, get_gemini_client
from app.core.agent_logger import AgentLogger, AgentType
from app.services.skill_extractor import extract_skills_from_text

logger = logging.getLogger(__name__)


@dataclass
class ExtractedEducation:
    institution: str | None = None
    degree: str | None = None
    field: str | None = None
    start_year: int | None = None
    end_year: int | None = None
    cgpa: float | None = None
    percentage: float | None = None


@dataclass
class ExtractedExperience:
    company: str | None = None
    role: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    is_current: bool = False
    description: str | None = None


@dataclass
class ExtractedProject:
    name: str | None = None
    tech_stack: list[str] = field(default_factory=list)
    description: str | None = None
    link: str | None = None


@dataclass
class ResumeExtraction:
    """Complete resume extraction result."""
    # Core profile
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    linkedin: str | None = None
    github: str | None = None
    portfolio: str | None = None
    
    # Extracted data
    skills: list[str] = field(default_factory=list)
    normalized_skills: list[str] = field(default_factory=list)
    education: list[ExtractedEducation] = field(default_factory=list)
    experience: list[ExtractedExperience] = field(default_factory=list)
    projects: list[ExtractedProject] = field(default_factory=list)
    
    # Summary
    total_years_experience: float | None = None
    highest_degree: str | None = None
    
    # Metadata
    extraction_confidence: float = 0.0
    parser_used: str = "gemini"  # gemini | rule_based


class ResumeAgent:
    """
    Gemini-powered resume intelligence agent.
    
    Extracts structured data from resume text and normalizes skills
    using the existing skill taxonomy.
    """
    
    RESUME_SCHEMA = {
        "type": "object",
        "properties": {
            "full_name": {"type": ["string", "null"]},
            "email": {"type": ["string", "null"]},
            "phone": {"type": ["string", "null"]},
            "location": {"type": ["string", "null"]},
            "linkedin": {"type": ["string", "null"]},
            "github": {"type": ["string", "null"]},
            "portfolio": {"type": ["string", "null"]},
            "skills": {
                "type": "array",
                "items": {"type": "string"},
                "description": "All technical and soft skills mentioned"
            },
            "education": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "institution": {"type": ["string", "null"]},
                        "degree": {"type": ["string", "null"]},
                        "field": {"type": ["string", "null"]},
                        "start_year": {"type": ["integer", "null"]},
                        "end_year": {"type": ["integer", "null"]},
                        "cgpa": {"type": ["number", "null"]},
                        "percentage": {"type": ["number", "null"]}
                    }
                }
            },
            "experience": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "company": {"type": ["string", "null"]},
                        "role": {"type": ["string", "null"]},
                        "start_date": {"type": ["string", "null"]},
                        "end_date": {"type": ["string", "null"]},
                        "is_current": {"type": "boolean"},
                        "description": {"type": ["string", "null"]}
                    }
                }
            },
            "projects": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": ["string", "null"]},
                        "tech_stack": {"type": "array", "items": {"type": "string"}},
                        "description": {"type": ["string", "null"]},
                        "link": {"type": ["string", "null"]}
                    }
                }
            }
        },
        "required": ["skills", "education", "experience", "projects"]
    }
    
    SYSTEM_PROMPT = """You are a resume parsing assistant.

Extract structured information from the resume text provided.

Guidelines:
1. Be thorough - extract all skills, education, experience, and projects
2. For skills, include both technical (programming languages, frameworks, tools) and soft skills
3. For education, extract institution name, degree, field of study, years, and CGPA/percentage if mentioned
4. For experience, extract company, role, duration, and key responsibilities
5. For projects, extract name, technologies used, brief description, and any links
6. Normalize data - clean up whitespace, standardize company names
7. If a field is not found, return null (not empty string)

Focus on accuracy over completeness. If you're unsure about a field, return null."""
    
    def __init__(self):
        self.client = get_gemini_client(model=GeminiModel.FLASH, temperature=0.1)
    
    async def extract(
        self,
        resume_text: str,
        agent_logger: AgentLogger | None = None
    ) -> ResumeExtraction:
        """
        Extract structured data from resume text.
        
        Args:
            resume_text: Raw text extracted from resume PDF/DOCX
            agent_logger: Optional logger for tracking
            
        Returns:
            ResumeExtraction with all extracted and normalized data
        """
        if agent_logger:
            agent_logger.log_started(
                AgentType.RESUME,
                "extract_resume",
                {"resume_length": len(resume_text)},
                {"resume_chars": len(resume_text)}
            )
        
        try:
            # Try Gemini extraction first
            result = await self._extract_with_gemini(resume_text)
            
            # Normalize skills using taxonomy
            result.normalized_skills = self._normalize_skills(result.skills)
            
            # Calculate confidence
            result.extraction_confidence = self._calculate_confidence(result)
            
            if agent_logger:
                agent_logger.log_success(
                    AgentType.RESUME,
                    "extract_resume",
                    {
                        "skills_found": len(result.skills),
                        "education_entries": len(result.education),
                        "experience_entries": len(result.experience),
                        "project_entries": len(result.projects)
                    },
                    {
                        "confidence": result.extraction_confidence,
                        "parser": "gemini"
                    }
                )
            
            return result
            
        except Exception as e:
            logger.warning(f"Gemini resume extraction failed: {e}")
            
            if agent_logger:
                agent_logger.log_failed(AgentType.RESUME, "extract_resume", e)
            
            # Fallback to rule-based extraction
            fallback_result = self._extract_with_fallback(resume_text)
            
            if agent_logger:
                agent_logger.log_success(
                    AgentType.RESUME,
                    "extract_resume",
                    {"skills_found": len(fallback_result.skills)},
                    {"parser": "fallback", "confidence": fallback_result.extraction_confidence}
                )
            
            return fallback_result
    
    async def _extract_with_gemini(self, resume_text: str) -> ResumeExtraction:
        """Extract using Gemini 2.5 Flash."""
        
        # Truncate very long resumes
        max_chars = 15000
        truncated_text = resume_text[:max_chars]
        if len(resume_text) > max_chars:
            truncated_text += "\n\n[Resume truncated for processing...]"
        
        response = await self.client.generate(
            prompt=f"Parse this resume and extract structured data:\n\n{truncated_text}",
            system_prompt=self.SYSTEM_PROMPT,
            output_schema=self.RESUME_SCHEMA
        )
        
        if not response.success or not response.structured_output:
            raise ValueError(f"Gemini extraction failed: {response.error}")
        
        data = response.structured_output
        
        # Convert to dataclasses
        education_list = [
            ExtractedEducation(**edu) for edu in (data.get("education") or [])
        ]
        experience_list = [
            ExtractedExperience(**exp) for exp in (data.get("experience") or [])
        ]
        projects_list = [
            ExtractedProject(**proj) for proj in (data.get("projects") or [])
        ]
        
        return ResumeExtraction(
            full_name=data.get("full_name"),
            email=data.get("email"),
            phone=data.get("phone"),
            location=data.get("location"),
            linkedin=data.get("linkedin"),
            github=data.get("github"),
            portfolio=data.get("portfolio"),
            skills=data.get("skills") or [],
            normalized_skills=[],  # Will be populated after
            education=education_list,
            experience=experience_list,
            projects=projects_list,
            parser_used="gemini"
        )
    
    def _extract_with_fallback(self, resume_text: str) -> ResumeExtraction:
        """Fallback to rule-based skill extraction only."""
        
        # Use existing skill extractor
        extracted_skills = extract_skills_from_text(resume_text)
        skill_names = [s["name"] for s in extracted_skills]
        
        return ResumeExtraction(
            skills=skill_names,
            normalized_skills=skill_names,
            extraction_confidence=0.4,  # Lower confidence for fallback
            parser_used="fallback"
        )
    
    def _normalize_skills(self, skills: list[str]) -> list[str]:
        """Normalize skills using taxonomy."""
        normalized = []
        
        for skill in skills:
            # Use existing skill extractor for normalization
            extracted = extract_skills_from_text(skill)
            for e in extracted:
                if e["name"] not in normalized:
                    normalized.append(e["name"])
            
            # If no match found, keep original
            if not extracted and skill not in normalized:
                normalized.append(skill)
        
        return normalized
    
    def _calculate_confidence(self, result: ResumeExtraction) -> float:
        """Calculate extraction confidence score."""
        
        scores = []
        
        # Skills found
        if result.skills:
            scores.append(min(len(result.skills) / 5, 1.0))  # Cap at 5 skills
        
        # Education found
        if result.education:
            scores.append(0.2)
        
        # Experience found
        if result.experience:
            scores.append(0.2)
        
        # Projects found
        if result.projects:
            scores.append(0.2)
        
        # Contact info
        if result.email or result.phone:
            scores.append(0.2)
        
        return min(sum(scores), 1.0)
    
    async def sync_to_profile(
        self,
        student_id: str,
        extraction: ResumeExtraction,
        agent_logger: AgentLogger | None = None
    ) -> bool:
        """
        Sync extracted resume data to student profile via API.
        
        Args:
            student_id: Student UUID
            extraction: Extracted resume data
            agent_logger: Optional logger
            
        Returns:
            True if sync successful
        """
        # This will be implemented to call backend API
        # to update student profile with extracted data
        pass


# Singleton
_resume_agent: ResumeAgent | None = None


def get_resume_agent() -> ResumeAgent:
    """Get or create ResumeAgent singleton."""
    global _resume_agent
    if _resume_agent is None:
        _resume_agent = ResumeAgent()
    return _resume_agent


async def extract_resume(
    resume_text: str,
    agent_logger: AgentLogger | None = None
) -> ResumeExtraction:
    """Convenience function for resume extraction."""
    agent = get_resume_agent()
    return await agent.extract(resume_text, agent_logger)
