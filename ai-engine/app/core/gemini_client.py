"""
Gemini 2.5 Flash client with health check, retry logic, and structured output.
All Gemini calls go through this wrapper.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, TypeVar

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage

from app.config import settings

logger = logging.getLogger(__name__)

T = TypeVar("T")


class GeminiModel(str, Enum):
    FLASH = "gemini-2.5-flash"
    PRO = "gemini-2.5-pro"


@dataclass
class GeminiHealth:
    """Health check result for Gemini API."""
    is_healthy: bool
    model: str
    latency_ms: float
    error: str | None = None
    quota_remaining: bool = True


@dataclass
class GeminiResponse:
    """Structured response from Gemini."""
    success: bool
    content: str
    structured_output: dict[str, Any] | None = None
    model_used: str = ""
    latency_ms: float = 0.0
    error: str | None = None
    retry_count: int = 0


class GeminiClient:
    """
    Production-ready Gemini client with:
    - Health checks before every call
    - Exponential backoff retry
    - Structured JSON output
    - Circuit breaker pattern
    """
    
    def __init__(
        self,
        model: GeminiModel = GeminiModel.FLASH,
        temperature: float = 0.3,
        max_output_tokens: int = 2048,
        max_retries: int = 3,
        timeout_ms: int = 30000
    ):
        self.model = model
        self.temperature = temperature
        self.max_output_tokens = max_output_tokens
        self.max_retries = max_retries
        self.timeout_ms = timeout_ms
        
        self._api_key = (
            os.environ.get("GOOGLE_AI_API_KEY")
            or os.environ.get("GEMINI_API_KEY")
            or settings.GOOGLE_AI_API_KEY
            or settings.GEMINI_API_KEY
        )
        
        self._llm: ChatGoogleGenerativeAI | None = None
        self._consecutive_failures = 0
        self._circuit_open = False
        self._circuit_threshold = 5  # Open circuit after 5 consecutive failures
    
    def _get_llm(self) -> ChatGoogleGenerativeAI:
        """Lazy init LLM with current settings."""
        if self._llm is None:
            if not self._api_key:
                raise ValueError("Gemini API key not configured")
            
            self._llm = ChatGoogleGenerativeAI(
                model=self.model.value,
                google_api_key=self._api_key,
                temperature=self.temperature,
                max_output_tokens=self.max_output_tokens,
            )
        return self._llm
    
    async def health_check(self) -> GeminiHealth:
        """Quick health check - ping Gemini with a simple prompt."""
        import time
        
        start = time.time()
        try:
            llm = self._get_llm()
            response = await asyncio.wait_for(
                llm.ainvoke([HumanMessage(content="Hi")]),
                timeout=5.0
            )
            latency = (time.time() - start) * 1000
            
            # Reset failure count on success
            self._consecutive_failures = 0
            self._circuit_open = False
            
            return GeminiHealth(
                is_healthy=True,
                model=self.model.value,
                latency_ms=latency,
                quota_remaining=True
            )
            
        except asyncio.TimeoutError:
            return GeminiHealth(
                is_healthy=False,
                model=self.model.value,
                latency_ms=5000,
                error="Timeout - Gemini not responding",
                quota_remaining=True
            )
        except Exception as e:
            latency = (time.time() - start) * 1000
            error_str = str(e).lower()
            quota_exceeded = "quota" in error_str or "rate limit" in error_str
            
            return GeminiHealth(
                is_healthy=False,
                model=self.model.value,
                latency_ms=latency,
                error=str(e)[:200],
                quota_remaining=not quota_exceeded
            )
    
    async def generate(
        self,
        prompt: str,
        system_prompt: str | None = None,
        output_schema: dict[str, Any] | None = None,
        fallback_fn: Callable[[], T] | None = None
    ) -> GeminiResponse:
        """
        Generate with automatic retry and circuit breaker.
        
        Args:
            prompt: User prompt
            system_prompt: Optional system instructions
            output_schema: If provided, enforces JSON structured output
            fallback_fn: Called if all retries fail
        """
        # Check circuit breaker
        if self._circuit_open:
            logger.warning("Circuit breaker open - skipping Gemini call")
            if fallback_fn:
                fallback_result = fallback_fn()
                return GeminiResponse(
                    success=True,
                    content=str(fallback_result),
                    model_used="fallback",
                    error="Circuit breaker open - using fallback"
                )
            return GeminiResponse(
                success=False,
                content="",
                error="Circuit breaker open - Gemini unavailable"
            )
        
        import time
        
        last_error: Exception | None = None
        
        for attempt in range(self.max_retries):
            start = time.time()
            
            try:
                # Health check before call (skip on first attempt)
                if attempt > 0:
                    health = await self.health_check()
                    if not health.is_healthy:
                        logger.warning(f"Gemini unhealthy, attempt {attempt + 1}: {health.error}")
                        if not health.quota_remaining:
                            # Don't retry on quota exceeded
                            break
                        await asyncio.sleep(2 ** attempt)  # Exponential backoff
                        continue
                
                # Build messages
                messages = []
                if system_prompt:
                    messages.append(SystemMessage(content=system_prompt))
                messages.append(HumanMessage(content=prompt))
                
                # If schema provided, add JSON instruction
                if output_schema:
                    json_instruction = f"""
Respond ONLY with valid JSON matching this schema:
{json.dumps(output_schema, indent=2)}

Do not include markdown formatting, explanations, or any text outside the JSON.
"""
                    messages.append(HumanMessage(content=json_instruction))
                
                # Call Gemini
                llm = self._get_llm()
                response = await asyncio.wait_for(
                    llm.ainvoke(messages),
                    timeout=self.timeout_ms / 1000
                )
                
                latency = (time.time() - start) * 1000
                content = self._extract_text(response)
                
                # Parse structured output if schema provided
                structured_output = None
                if output_schema:
                    structured_output = self._safe_json_parse(content)
                    if structured_output is None:
                        # Retry on invalid JSON
                        last_error = ValueError(f"Invalid JSON response: {content[:200]}")
                        logger.warning(f"Invalid JSON from Gemini, attempt {attempt + 1}")
                        continue
                
                # Success!
                self._consecutive_failures = 0
                
                return GeminiResponse(
                    success=True,
                    content=content,
                    structured_output=structured_output,
                    model_used=self.model.value,
                    latency_ms=latency,
                    retry_count=attempt
                )
                
            except asyncio.TimeoutError:
                last_error = TimeoutError(f"Gemini timeout after {self.timeout_ms}ms")
                logger.warning(f"Gemini timeout, attempt {attempt + 1}")
                await asyncio.sleep(2 ** attempt)
                
            except Exception as e:
                last_error = e
                error_str = str(e).lower()
                
                # Don't retry on quota exceeded
                if "quota" in error_str or "rate limit" in error_str:
                    logger.error(f"Gemini quota exceeded: {e}")
                    break
                
                logger.warning(f"Gemini error, attempt {attempt + 1}: {e}")
                await asyncio.sleep(2 ** attempt)
        
        # All retries exhausted
        self._consecutive_failures += 1
        
        # Open circuit breaker if threshold reached
        if self._consecutive_failures >= self._circuit_threshold:
            self._circuit_open = True
            logger.error(f"Circuit breaker opened after {self._consecutive_failures} failures")
        
        # Try fallback
        if fallback_fn:
            try:
                fallback_result = fallback_fn()
                return GeminiResponse(
                    success=True,
                    content=str(fallback_result),
                    model_used="fallback",
                    error=f"Gemini failed after {self.max_retries} retries, using fallback"
                )
            except Exception as fallback_error:
                return GeminiResponse(
                    success=False,
                    content="",
                    error=f"Gemini failed: {last_error}. Fallback also failed: {fallback_error}"
                )
        
        return GeminiResponse(
            success=False,
            content="",
            error=f"Gemini failed after {self.max_retries} retries: {last_error}"
        )
    
    def _extract_text(self, response: Any) -> str:
        """Extract text from various Gemini response formats."""
        content = getattr(response, "content", None)
        if content is None and hasattr(response, "text"):
            content = getattr(response, "text", None)
        
        if isinstance(content, str):
            return content.strip()
        
        if isinstance(content, list):
            parts = []
            for block in content:
                if isinstance(block, str):
                    parts.append(block)
                elif isinstance(block, dict):
                    t = block.get("text")
                    if isinstance(t, str):
                        parts.append(t)
                elif hasattr(block, "text"):
                    parts.append(str(getattr(block, "text", "") or ""))
            return " ".join(parts).strip()
        
        return str(content or "").strip()
    
    def _safe_json_parse(self, text: str) -> dict[str, Any] | None:
        """Safely parse JSON, handling markdown fences."""
        # Remove markdown fences
        cleaned = text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
        
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            return None


# Global client instance (singleton pattern)
_gemini_client: GeminiClient | None = None


def get_gemini_client(
    model: GeminiModel = GeminiModel.FLASH,
    temperature: float = 0.3
) -> GeminiClient:
    """Get or create Gemini client singleton."""
    global _gemini_client
    if _gemini_client is None:
        _gemini_client = GeminiClient(model=model, temperature=temperature)
    return _gemini_client


async def check_gemini_health() -> GeminiHealth:
    """Quick health check - can be called before any Gemini operation."""
    client = get_gemini_client()
    return await client.health_check()
