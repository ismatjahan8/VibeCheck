from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.database import get_db
from app.models.conversation_member import ConversationMember
from app.models.message import Message
from app.models.profile import Profile
from app.models.user import User
from app.schemas.chat import MessageOut

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/users")
def search_users(
    q: str = Query(min_length=1, max_length=100),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[dict]:
    # MVP: search by email or display name
    term = f"%{q.lower()}%"
    users = (
        db.query(User)
        .outerjoin(Profile, Profile.user_id == User.id)
        .filter(User.id != current.id)
        .filter(or_(User.email.ilike(term), Profile.display_name.ilike(term)))
        .limit(20)
        .all()
    )
    out = []
    for u in users:
        dn = u.profile.display_name if u.profile else ""
        if q.lower() not in u.email.lower() and dn and q.lower() not in dn.lower():
            continue
        out.append(
            {
                "id": u.id,
                "email": u.email,
                "display_name": dn or u.email,
                "avatar_url": (u.profile.avatar_url if u.profile else None),
            }
        )
    return out


@router.get("/messages", response_model=list[MessageOut])
def search_messages(
    q: str = Query(min_length=1, max_length=200),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[MessageOut]:
    term = f"%{q}%"
    conv_ids = select(ConversationMember.conversation_id).where(ConversationMember.user_id == current.id)
    msgs = (
        db.query(Message)
        .filter(Message.conversation_id.in_(conv_ids))
        .filter(Message.body.ilike(term))
        .order_by(Message.id.desc())
        .limit(limit)
        .all()
    )
    # return newest first for search results
    return [
        MessageOut(
            id=m.id,
            conversation_id=m.conversation_id,
            sender_id=m.sender_id,
            body=m.body,
            created_at=m.created_at,
            attachments=[],
        )
        for m in msgs
    ]

