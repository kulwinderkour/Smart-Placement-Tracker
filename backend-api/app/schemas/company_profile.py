from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class CompanyProfileBase(BaseModel):
    company_name: str
    website: Optional[str] = None
    company_email: Optional[str] = None
    hr_contact_number: Optional[str] = None
    address: Optional[str] = None
    description: Optional[str] = None
    industry_type: Optional[str] = None
    company_size: Optional[str] = None
    logo_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    location: Optional[str] = None
    founded_year: Optional[int] = None


class CompanyProfileCreate(CompanyProfileBase):
    # True = save as draft, False = final submit
    submit: bool = False


class CompanyProfileUpdate(BaseModel):
    company_name: Optional[str] = None
    website: Optional[str] = None
    company_email: Optional[str] = None
    hr_contact_number: Optional[str] = None
    address: Optional[str] = None
    description: Optional[str] = None
    industry_type: Optional[str] = None
    company_size: Optional[str] = None
    logo_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    location: Optional[str] = None
    founded_year: Optional[int] = None
    submit: bool = False


class CompanyProfileResponse(BaseModel):
    id: UUID
    user_id: UUID
    company_name: str
    website: Optional[str]
    company_email: Optional[str]
    hr_contact_number: Optional[str]
    address: Optional[str]
    description: Optional[str]
    industry_type: Optional[str]
    company_size: Optional[str]
    logo_url: Optional[str]
    linkedin_url: Optional[str]
    location: Optional[str]
    founded_year: Optional[int]
    is_draft: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
