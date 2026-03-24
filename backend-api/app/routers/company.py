"""Company profile router — POST/GET /api/v1/company/profile."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.user import User, UserRole
from app.schemas.company_profile import (
    CompanyProfileCreate,
    CompanyProfileResponse,
    CompanyProfileUpdate,
)
from app.services import company_profile as profile_service

router = APIRouter(prefix="/company", tags=["company"])


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Guard: only admin-role users may access onboarding profile routes."""
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.get("/profile", response_model=CompanyProfileResponse)
async def get_company_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Fetch the authenticated admin's onboarding profile."""
    profile = await profile_service.get_profile(current_user.id, db)
    if not profile:
        raise HTTPException(status_code=404, detail="Company profile not found")
    return profile


@router.post("/profile", response_model=CompanyProfileResponse, status_code=200)
async def save_company_profile(
    data: CompanyProfileCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Create or update the company profile.

    Pass ``submit=true`` in the body to finalise the profile and unlock the
    dashboard. Pass ``submit=false`` (default) to save a draft.
    """
    payload = data.model_dump(exclude={"submit"}, exclude_none=True)
    profile = await profile_service.create_profile(
        user_id=current_user.id,
        data=payload,
        submit=data.submit,
        db=db,
    )
    return profile


@router.put("/profile", response_model=CompanyProfileResponse, status_code=200)
async def update_company_profile(
    data: CompanyProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Update the authenticated admin's onboarding profile using partial fields."""
    payload = data.model_dump(exclude={"submit"}, exclude_none=True)
    profile = await profile_service.update_profile(
        user_id=current_user.id,
        data=payload,
        submit=data.submit,
        db=db,
    )
    return profile
