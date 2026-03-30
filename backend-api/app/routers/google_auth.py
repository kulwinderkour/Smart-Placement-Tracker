import os
import uuid
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.models.user import User, UserRole
from app.models.student import Student
from app.utils.security import create_access_token, create_refresh_token, hash_password

router = APIRouter(prefix="/auth", tags=["google_auth"])

# Using localhost:3000 mapping based on Vite server console output
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "YOUR_GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "YOUR_GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = "http://localhost:8000/api/v1/auth/google/callback"


@router.get("/google")
async def google_login():
    """Redirects to the Google OAuth2 consent screen."""
    scope = "openid email profile"
    url = f"https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id={GOOGLE_CLIENT_ID}&redirect_uri={GOOGLE_REDIRECT_URI}&scope={scope}&access_type=offline&prompt=consent"
    return RedirectResponse(url)


@router.get("/google/callback")
async def google_callback(code: str = Query(None), db: AsyncSession = Depends(get_db)):
    if not code:
        raise HTTPException(status_code=400, detail="Code not provided")

    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code",
    }

    async with httpx.AsyncClient() as client:
        # 1. Exchange auth code for access token from Google
        resp = await client.post(token_url, data=token_data)
        if resp.status_code != 200:
            return RedirectResponse(f"{FRONTEND_URL}/login-form?error=google_auth_failed")

        auth_data = resp.json()
        google_access_token = auth_data.get("access_token")

        if not google_access_token:
            return RedirectResponse(f"{FRONTEND_URL}/login-form?error=google_token_missing")

        # 2. Get user info using the Google access token
        userinfo_resp = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {google_access_token}"}
        )
        if userinfo_resp.status_code != 200:
            return RedirectResponse(f"{FRONTEND_URL}/login-form?error=google_userinfo_failed")

        user_info = userinfo_resp.json()

    email = user_info.get("email")
    if not email:
        return RedirectResponse(f"{FRONTEND_URL}/login-form?error=google_email_missing")

    # 3. Check or Create User in the local database
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        # Create a new student user automatically if they don't exist
        random_password = str(uuid.uuid4())  # Placeholder password for OAuth users
        user = User(
            id=uuid.uuid4(),
            email=email,
            password_hash=hash_password(random_password),
            role=UserRole.student,
        )
        db.add(user)

        name = user_info.get("name", email.split("@")[0])
        student = Student(
            id=uuid.uuid4(),
            user_id=user.id,
            full_name=name,
        )
        db.add(student)

        await db.commit()
        await db.refresh(user)

    # 4. Generate system access tokens for our app
    token_data_jwt = {"sub": str(user.id), "email": user.email, "role": user.role.value}
    our_access_token = create_access_token(token_data_jwt)
    our_refresh_token = create_refresh_token(token_data_jwt)

    # 5. Redirect back to frontend auth callback route with the tokens
    redirect_url = f"{FRONTEND_URL}/auth/callback?access_token={our_access_token}&refresh_token={our_refresh_token}"
    return RedirectResponse(redirect_url)
