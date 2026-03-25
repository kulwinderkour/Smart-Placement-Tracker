import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.company_profile import CompanyProfile
from app.models.student import Student
from app.models.user import User, UserRole
from app.schemas.user import LoginResponse, UserLogin, UserRegister, UserResponse
from app.utils.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        id=uuid.uuid4(),
        email=data.email,
        password_hash=hash_password(data.password),
        role=data.role,
    )
    db.add(user)

    if data.role.value == "student":
        student = Student(
            id=uuid.uuid4(),
            user_id=user.id,
            full_name=data.email.split("@")[0],
        )
        db.add(student)

    await db.commit()
    await db.refresh(user)
    return user


@router.post("/login", response_model=LoginResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token_data = {"sub": str(user.id), "email": user.email, "role": user.role.value}

    is_company_profile_completed = False
    if user.role == UserRole.provider:
        cp_result = await db.execute(
            select(CompanyProfile).where(
                CompanyProfile.user_id == user.id,
                CompanyProfile.is_draft.is_(False),
            )
        )
        is_company_profile_completed = cp_result.scalar_one_or_none() is not None

    return LoginResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        role=user.role.value,
        is_onboarding_completed=user.is_onboarding_completed,
        is_company_profile_completed=is_company_profile_completed,
    )


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return current_user
