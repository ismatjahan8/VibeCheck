from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.database import get_db
from app.models.profile import Profile
from app.models.user import User
from app.schemas.user import ProfileUpdate, UserOut

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserOut)
def me(current: User = Depends(get_current_user)) -> UserOut:
    return UserOut(
        id=current.id,
        email=current.email,
        profile={
            "display_name": current.profile.display_name if current.profile else "",
            "avatar_url": current.profile.avatar_url if current.profile else None,
            "status": current.profile.status if current.profile else "",
        },
    )


@router.put("/me/profile", response_model=UserOut)
def update_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> UserOut:
    profile = current.profile
    if not profile:
        profile = Profile(user_id=current.id)
        db.add(profile)
        db.flush()

    if payload.display_name is not None:
        profile.display_name = payload.display_name
    if payload.avatar_url is not None:
        profile.avatar_url = payload.avatar_url
    if payload.status is not None:
        profile.status = payload.status

    db.add(profile)
    db.commit()
    db.refresh(current)
    return me(current)

