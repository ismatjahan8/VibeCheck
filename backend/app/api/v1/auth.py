from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_one_time_token,
    hash_password,
    verify_password,
)
from app.db.database import get_db
from app.models.profile import Profile
from app.models.user import User
from app.schemas.auth import ForgotPasswordRequest, ResetPasswordRequest, SignupRequest, TokenResponse
from app.services.email_service import send_email
from app.services.google_oauth_service import GOOGLE_AUTH_BASE, GOOGLE_TOKEN_URL, GOOGLE_USERINFO_URL, get_client, is_configured

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse)
def signup(payload: SignupRequest, db: Session = Depends(get_db)) -> TokenResponse:
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(email=payload.email.lower(), password_hash=hash_password(payload.password))
    user.profile = Profile(display_name=payload.display_name or "")
    db.add(user)
    db.commit()
    db.refresh(user)
    return TokenResponse(access_token=create_access_token(str(user.id)))


@router.post("/login", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)) -> TokenResponse:
    user = db.query(User).filter(User.email == form.username.lower()).first()
    if not user or not user.password_hash or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return TokenResponse(access_token=create_access_token(str(user.id)))


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)) -> dict:
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    # Always return ok to avoid account enumeration.
    if user:
        token = create_one_time_token(str(user.id), purpose="password_reset", minutes=30)
        reset_url = f"{settings.CORS_ORIGINS.split(',')[0].rstrip('/')}/reset-password?token={token}"
        send_email(
            to_email=user.email,
            subject="VibeCheck password reset",
            body=f"Reset your password:\n\n{reset_url}\n\nThis link expires in 30 minutes.",
        )
    return {"ok": True}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)) -> dict:
    from jose import JWTError

    from app.core.security import decode_token

    try:
        decoded = decode_token(payload.token)
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid token")

    if decoded.get("purpose") != "password_reset":
        raise HTTPException(status_code=400, detail="Invalid token purpose")
    try:
        user_id = int(decoded.get("sub", "0"))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid token subject")

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=400, detail="User not found")
    user.password_hash = hash_password(payload.new_password)
    db.add(user)
    db.commit()
    return {"ok": True}


@router.get("/google/url")
def google_auth_url() -> dict:
    if not is_configured():
        raise HTTPException(status_code=400, detail="Google OAuth not configured")
    # Minimal auth URL generation (client-side redirect)
    # state should be CSRF-protected; for MVP we omit server-side state storage.
    url = (
        f"{GOOGLE_AUTH_BASE}"
        f"?client_id={settings.GOOGLE_CLIENT_ID}"
        f"&redirect_uri={settings.GOOGLE_REDIRECT_URI}"
        f"&response_type=code"
        f"&scope=openid%20email%20profile"
        f"&access_type=offline"
        f"&prompt=consent"
    )
    return {"url": url}


@router.get("/google/callback", response_model=TokenResponse)
async def google_callback(code: str, db: Session = Depends(get_db)) -> TokenResponse:
    if not is_configured():
        raise HTTPException(status_code=400, detail="Google OAuth not configured")

    client = get_client()
    token = await client.fetch_token(GOOGLE_TOKEN_URL, code=code)
    resp = await client.get(GOOGLE_USERINFO_URL, token=token)
    resp.raise_for_status()
    info = resp.json()

    email = (info.get("email") or "").lower()
    sub = info.get("sub")
    if not email or not sub:
        raise HTTPException(status_code=400, detail="Invalid Google userinfo")

    user = db.query(User).filter((User.google_sub == sub) | (User.email == email)).first()
    if not user:
        user = User(email=email, google_sub=sub)
        user.profile = Profile(display_name=info.get("name") or "")
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        if not user.google_sub:
            user.google_sub = sub
            db.add(user)
            db.commit()

    return TokenResponse(access_token=create_access_token(str(user.id)))

