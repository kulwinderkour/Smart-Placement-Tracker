from pydantic import BaseModel
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

    class Config:
        from_attributes = True


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
