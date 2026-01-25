from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.database import get_db
from app.models.conversation import Conversation
from app.models.conversation_member import ConversationMember
from app.models.user import User
from app.schemas.chat import ConversationCreate, ConversationOut

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.get("", response_model=list[ConversationOut])
def list_conversations(db: Session = Depends(get_db), current: User = Depends(get_current_user)) -> list[ConversationOut]:
    memberships = (
        db.query(ConversationMember)
        .filter(ConversationMember.user_id == current.id)
        .order_by(ConversationMember.joined_at.desc())
        .all()
    )
    out: list[ConversationOut] = []
    for m in memberships:
        conv = m.conversation
        member_ids = [mm.user_id for mm in conv.members]
        out.append(ConversationOut(id=conv.id, type=conv.type, title=conv.title, member_user_ids=member_ids))
    return out


@router.post("", response_model=ConversationOut)
def create_conversation(
    payload: ConversationCreate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> ConversationOut:
    member_ids = set(payload.member_user_ids)
    member_ids.add(current.id)

    if payload.type == "direct":
        # direct must be exactly 2 users
        if len(member_ids) != 2:
            raise HTTPException(status_code=400, detail="Direct conversation needs exactly 2 members")

        # Find existing direct conversation with these two members
        a, b = sorted(member_ids)
        existing = (
            db.query(Conversation)
            .filter(Conversation.type == "direct")
            .join(Conversation.members)
            .group_by(Conversation.id)
            .having(func.count(ConversationMember.id) == 2)
            .all()
        )
        for conv in existing:
            mids = sorted([m.user_id for m in conv.members])
            if mids == [a, b]:
                return ConversationOut(
                    id=conv.id, type=conv.type, title=conv.title, member_user_ids=[a, b]
                )

    conv = Conversation(type=payload.type, title=payload.title if payload.type == "group" else None)
    db.add(conv)
    db.flush()

    # creator admin for group
    for uid in member_ids:
        role = "admin" if (payload.type == "group" and uid == current.id) else "member"
        db.add(ConversationMember(conversation_id=conv.id, user_id=uid, role=role))

    db.commit()
    db.refresh(conv)
    return ConversationOut(
        id=conv.id,
        type=conv.type,
        title=conv.title,
        member_user_ids=[m.user_id for m in conv.members],
    )


@router.post("/{conversation_id}/members/{user_id}/add")
def add_member(
    conversation_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> dict:
    conv = db.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv.type != "group":
        raise HTTPException(status_code=400, detail="Only group supports members")
    me = db.query(ConversationMember).filter_by(conversation_id=conversation_id, user_id=current.id).first()
    if not me or me.role != "admin":
        raise HTTPException(status_code=403, detail="Admin required")
    existing = db.query(ConversationMember).filter_by(conversation_id=conversation_id, user_id=user_id).first()
    if existing:
        return {"ok": True}
    db.add(ConversationMember(conversation_id=conversation_id, user_id=user_id, role="member"))
    db.commit()
    return {"ok": True}


@router.post("/{conversation_id}/members/{user_id}/remove")
def remove_member(
    conversation_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> dict:
    conv = db.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv.type != "group":
        raise HTTPException(status_code=400, detail="Only group supports members")
    me = db.query(ConversationMember).filter_by(conversation_id=conversation_id, user_id=current.id).first()
    if not me or me.role != "admin":
        raise HTTPException(status_code=403, detail="Admin required")
    m = db.query(ConversationMember).filter_by(conversation_id=conversation_id, user_id=user_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(m)
    db.commit()
    return {"ok": True}

