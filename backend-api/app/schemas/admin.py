from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class IndustryDistributionItem(BaseModel):
    industry_type: str
    count: int


class CompanyGrowthItem(BaseModel):
    month: str
    count: int


class AdminCompanySummary(BaseModel):
    id: UUID
    user_id: UUID
    company_name: str
    industry_type: str | None
    company_size: str | None
    company_email: str | None
    website: str | None
    location: str | None
    is_draft: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AdminRecentJob(BaseModel):
    id: UUID
    company_name: str
    role_title: str
    is_active: bool
    created_at: datetime


class AdminRecentApplication(BaseModel):
    id: UUID
    student_name: str
    company_name: str
    role_title: str
    status: str
    applied_at: datetime


class AdminStatsResponse(BaseModel):
    total_students: int
    total_companies: int
    total_jobs: int
    total_applications: int
    recent_companies: list[AdminCompanySummary]
    recent_jobs: list[AdminRecentJob]
    recent_applications: list[AdminRecentApplication]
    industry_distribution: list[IndustryDistributionItem]
    company_growth: list[CompanyGrowthItem]
