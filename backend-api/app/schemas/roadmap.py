import json
from pydantic import BaseModel, ConfigDict, field_validator
from typing import List, Dict, Any, Optional
from datetime import datetime


class RoadmapRequest(BaseModel):
    role: str
    skills: List[str]


class RoadmapResponse(BaseModel):
    id: int
    user_id: str
    role: str
    skills: List[str]
    roadmap_data: Dict[str, Any]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_validator("user_id", mode="before")
    @classmethod
    def coerce_uuid(cls, v):
        return str(v)

    @field_validator("skills", mode="before")
    @classmethod
    def parse_skills(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return []
        return v


class WeekPlan(BaseModel):
    week: int
    title: str
    description: str
    topics: List[str]
    resources: List[str]
    difficulty: str


class RoadmapData(BaseModel):
    title: str
    description: str
    totalWeeks: int
    weeks: List[WeekPlan]
