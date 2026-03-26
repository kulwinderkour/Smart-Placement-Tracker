"""Company profile service — clean data access layer."""
import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.company_profile import CompanyProfile
from app.models.user import User


async def get_profile(user_id: uuid.UUID, db: AsyncSession) -> Optional[CompanyProfile]:
    """Return the company profile for the given user, or None if not created yet."""
    result = await db.execute(
        select(CompanyProfile).where(CompanyProfile.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def create_or_update_profile(
    user_id: uuid.UUID,
    data: dict,
    submit: bool,
    db: AsyncSession,
) -> CompanyProfile:
    """Upsert the company profile.

    If *submit* is True the profile is marked as complete and the corresponding
    onboarding flag on the User row is flipped.
    """
    result = await db.execute(
        select(CompanyProfile).where(CompanyProfile.user_id == user_id)
    )
    profile = result.scalar_one_or_none()

    if profile is None:
        profile = CompanyProfile(id=uuid.uuid4(), user_id=user_id)
        db.add(profile)

    for field, value in data.items():
        if hasattr(profile, field) and value is not None:
            setattr(profile, field, value)

    if submit:
        profile.is_draft = False
        # Flip user onboarding flag
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if user:
            user.is_onboarding_completed = True

    await db.commit()
    await db.refresh(profile)
    return profile


async def create_profile(
    user_id: uuid.UUID,
    data: dict,
    submit: bool,
    db: AsyncSession,
) -> CompanyProfile:
    """Create profile if it does not exist, otherwise update it."""
    return await create_or_update_profile(
        user_id=user_id,
        data=data,
        submit=submit,
        db=db,
    )


async def update_profile(
    user_id: uuid.UUID,
    data: dict,
    submit: bool,
    db: AsyncSession,
) -> CompanyProfile:
    """Update profile for admin onboarding, creating one if none exists yet."""
    return await create_or_update_profile(
        user_id=user_id,
        data=data,
        submit=submit,
        db=db,
    )
