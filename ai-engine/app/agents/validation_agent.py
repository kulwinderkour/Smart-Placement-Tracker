"""
Job Validation Agent

Validates job postings before they go live:
- Company name present and valid
- Role title present and descriptive
- Salary/package reasonable (not 0, not unrealistic)
- Required skills listed
- Description meaningful (not too short, not generic)
- Location specified

Can be called by backend before job creation or by admins.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import Any

from app.core.gemini_client import GeminiClient, GeminiModel, get_gemini_client
from app.core.agent_logger import AgentLogger, AgentType

logger = logging.getLogger(__name__)


@dataclass
class ValidationIssue:
    """Single validation issue."""
    field: str
    severity: str  # error | warning | info
    message: str
    suggestion: str | None = None


@dataclass
class ValidationResult:
    """Complete validation result."""
    is_valid: bool = False
    can_publish: bool = False  # True if no errors
    issues: list[ValidationIssue] = field(default_factory=list)
    
    # Quality metrics
    quality_score: float = 0.0  # 0-100
    completeness_pct: float = 0.0  # 0-100
    
    # Normalized fields (if improvements made)
    normalized_company: str | None = None
    normalized_role: str | None = None
    extracted_skills: list[str] = field(default_factory=list)
    
    # Metadata
    validator_used: str = "gemini"  # gemini | rule_based


class JobValidationAgent:
    """
    Validates job postings for completeness and quality.
    
    Used before job goes live to ensure:
    1. Required fields present
    2. Data quality acceptable
    3. No spam/abuse patterns
    """
    
    # Schema for structured output
    VALIDATION_SCHEMA = {
        "type": "object",
        "properties": {
            "is_valid": {"type": "boolean"},
            "can_publish": {"type": "boolean"},
            "quality_score": {"type": "number"},  # 0-100
            "completeness_pct": {"type": "number"},  # 0-100
            "issues": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "field": {"type": "string"},
                        "severity": {"type": "string", "enum": ["error", "warning", "info"]},
                        "message": {"type": "string"},
                        "suggestion": {"type": ["string", "null"]}
                    },
                    "required": ["field", "severity", "message"]
                }
            },
            "normalized_company": {"type": ["string", "null"]},
            "normalized_role": {"type": ["string", "null"]},
            "extracted_skills": {"type": "array", "items": {"type": "string"}}
        },
        "required": ["is_valid", "can_publish", "quality_score", "completeness_pct", "issues"]
    }
    
    SYSTEM_PROMPT = """You are a job posting validator for a placement platform.

Validate job data and identify issues that would prevent publication or reduce quality.

Validation Rules:
1. company_name (required):
   - Error if missing or empty
   - Error if "test", "example", "company", "xyz" (placeholder names)
   - Warning if very short (< 3 chars) or generic

2. role_title (required):
   - Error if missing or empty
   - Error if "test", "example", "job", "position" (generic)
   - Warning if very vague ("Engineer" without qualifier)

3. salary_min / salary_max:
   - Error if both 0 or missing
   - Warning if below 2 LPA (unrealistic for skilled roles)
   - Warning if above 1 crore (1,00,00,000) - likely data entry error
   - Error if salary_max < salary_min

4. required_skills:
   - Warning if empty or < 2 skills
   - Warning if only generic soft skills ("communication", "teamwork") without tech skills

5. description (required):
   - Error if missing or < 50 characters
   - Warning if < 100 characters (too brief)
   - Warning if contains only buzzwords without actual details
   - Check for spam patterns (excessive caps, repeated words)

6. location:
   - Info if missing (remote jobs acceptable)

Output quality_score (0-100) based on:
- Completeness of required fields (40 points)
- Description quality (30 points)
- Skills quality (20 points)
- Salary appropriateness (10 points)

Set can_publish=True only if no errors (warnings OK)."""
    
    def __init__(self):
        self.client = get_gemini_client(model=GeminiModel.FLASH, temperature=0.1)
    
    async def validate(
        self,
        job_data: dict[str, Any],
        agent_logger: AgentLogger | None = None
    ) -> ValidationResult:
        """
        Validate a job posting.
        
        Args:
            job_data: Job dictionary with fields to validate
            agent_logger: Optional logger
            
        Returns:
            ValidationResult with issues and recommendations
        """
        if agent_logger:
            agent_logger.log_started(
                AgentType.VALIDATION,
                "validate_job",
                {"job_title": job_data.get("role_title", "unknown")},
                {"has_description": bool(job_data.get("description"))}
            )
        
        try:
            # Try Gemini validation first
            result = await self._validate_with_gemini(job_data)
            
            if agent_logger:
                agent_logger.log_success(
                    AgentType.VALIDATION,
                    "validate_job",
                    {
                        "is_valid": result.is_valid,
                        "can_publish": result.can_publish,
                        "quality_score": result.quality_score
                    },
                    {
                        "issue_count": len(result.issues),
                        "error_count": sum(1 for i in result.issues if i.severity == "error"),
                        "validator": "gemini"
                    }
                )
            
            return result
            
        except Exception as e:
            logger.warning(f"Gemini validation failed: {e}")
            
            if agent_logger:
                agent_logger.log_failed(AgentType.VALIDATION, "validate_job", e)
            
            # Fallback to rule-based
            fallback_result = self._validate_with_fallback(job_data)
            
            if agent_logger:
                agent_logger.log_success(
                    AgentType.VALIDATION,
                    "validate_job",
                    {"is_valid": fallback_result.is_valid},
                    {"validator": "fallback"}
                )
            
            return fallback_result
    
    async def _validate_with_gemini(self, job_data: dict) -> ValidationResult:
        """Validate using Gemini 2.5 Flash."""
        
        # Prepare job data for validation
        validation_input = {
            "company_name": job_data.get("company_name") or job_data.get("company", ""),
            "role_title": job_data.get("role_title") or job_data.get("title", ""),
            "salary_min": job_data.get("salary_min", 0),
            "salary_max": job_data.get("salary_max", 0),
            "required_skills": job_data.get("required_skills", []),
            "description": job_data.get("description", ""),
            "location": job_data.get("location", ""),
            "job_type": job_data.get("job_type", ""),
        }
        
        response = await self.client.generate(
            prompt=f"Validate this job posting:\n\n{validation_input}",
            system_prompt=self.SYSTEM_PROMPT,
            output_schema=self.VALIDATION_SCHEMA
        )
        
        if not response.success or not response.structured_output:
            raise ValueError(f"Gemini validation failed: {response.error}")
        
        data = response.structured_output
        
        # Convert issues to dataclasses
        issues = [
            ValidationIssue(**issue) for issue in data.get("issues", [])
        ]
        
        return ValidationResult(
            is_valid=data.get("is_valid", False),
            can_publish=data.get("can_publish", False),
            issues=issues,
            quality_score=data.get("quality_score", 0),
            completeness_pct=data.get("completeness_pct", 0),
            normalized_company=data.get("normalized_company"),
            normalized_role=data.get("normalized_role"),
            extracted_skills=data.get("extracted_skills", []),
            validator_used="gemini"
        )
    
    def _validate_with_fallback(self, job_data: dict) -> ValidationResult:
        """Fallback rule-based validation."""
        
        issues = []
        
        company = job_data.get("company_name") or job_data.get("company", "")
        role = job_data.get("role_title") or job_data.get("title", "")
        salary_min = job_data.get("salary_min", 0)
        salary_max = job_data.get("salary_max", 0)
        skills = job_data.get("required_skills", [])
        description = job_data.get("description", "")
        location = job_data.get("location", "")
        
        # Required field checks
        if not company or len(company.strip()) < 2:
            issues.append(ValidationIssue(
                field="company_name",
                severity="error",
                message="Company name is required",
                suggestion="Enter the actual company name"
            ))
        
        if not role or len(role.strip()) < 3:
            issues.append(ValidationIssue(
                field="role_title",
                severity="error",
                message="Role title is required",
                suggestion="Enter a descriptive job title (e.g., 'Software Engineer')"
            ))
        
        # Salary checks
        if salary_min == 0 and salary_max == 0:
            issues.append(ValidationIssue(
                field="salary",
                severity="error",
                message="Salary information is required",
                suggestion="Enter minimum and maximum salary/package"
            ))
        
        if salary_max > 0 and salary_min > salary_max:
            issues.append(ValidationIssue(
                field="salary",
                severity="error",
                message="Maximum salary cannot be less than minimum",
                suggestion="Fix the salary range"
            ))
        
        # Skills checks
        if not skills or len(skills) < 2:
            issues.append(ValidationIssue(
                field="required_skills",
                severity="warning",
                message="Add more required skills",
                suggestion="List at least 3-5 key technical skills"
            ))
        
        # Description checks
        if not description or len(description) < 50:
            issues.append(ValidationIssue(
                field="description",
                severity="error",
                message="Job description is too short",
                suggestion="Add at least 100 characters describing the role"
            ))
        
        # Calculate quality score
        score = 0
        if company:
            score += 20
        if role:
            score += 20
        if salary_min > 0:
            score += 10
        if skills and len(skills) >= 3:
            score += 20
        if description and len(description) >= 100:
            score += 20
        if location:
            score += 10
        
        has_errors = any(i.severity == "error" for i in issues)
        
        return ValidationResult(
            is_valid=not has_errors,
            can_publish=not has_errors,
            issues=issues,
            quality_score=score,
            completeness_pct=score,
            validator_used="rule_based"
        )
    
    def quick_validate(self, job_data: dict) -> tuple[bool, list[str]]:
        """
        Synchronous quick validation - returns (is_valid, error_messages).

        Admin jobs (company_profile_id IS NOT NULL) are verified SmartPlacement
        opportunities — salary, skills, and description are optional there.
        Only company name + role title are hard-required for all sources.
        """
        errors = []

        company = job_data.get("company_name") or job_data.get("company", "")
        role = job_data.get("role_title") or job_data.get("title", "")
        is_admin_job = bool(job_data.get("company_profile_id"))

        if not company:
            errors.append("Company name is required")

        if not role:
            errors.append("Role title is required")

        if not is_admin_job:
            salary_min = job_data.get("salary_min", 0)
            if salary_min == 0:
                errors.append("Salary/package information is required")

            skills = job_data.get("required_skills", [])
            if not skills:
                errors.append("At least one required skill must be specified")

            description = job_data.get("description", "")
            if not description or len(description) < 50:
                errors.append("Job description must be at least 50 characters")

        return len(errors) == 0, errors


# Singleton
_validation_agent: JobValidationAgent | None = None


def get_validation_agent() -> JobValidationAgent:
    """Get or create JobValidationAgent singleton."""
    global _validation_agent
    if _validation_agent is None:
        _validation_agent = JobValidationAgent()
    return _validation_agent


async def validate_job(
    job_data: dict[str, Any],
    agent_logger: AgentLogger | None = None
) -> ValidationResult:
    """Convenience function for job validation."""
    agent = get_validation_agent()
    return await agent.validate(job_data, agent_logger)
