from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.database import get_db
from app.models.block import Block
from app.models.contact import Contact
from app.models.user import User
from app.schemas.chat import ContactOut

router = APIRouter(prefix="/contacts", tags=["contacts"])


class ContactAddRequest(BaseModel):
    email: EmailStr


@router.get("", response_model=list[ContactOut])
def list_contacts(db: Session = Depends(get_db), current: User = Depends(get_current_user)) -> list[ContactOut]:
    contacts = (
        db.query(Contact)
        .filter(Contact.owner_user_id == current.id)
        .order_by(Contact.created_at.desc())
        .all()
    )
    out: list[ContactOut] = []
    for c in contacts:
        u = c.contact
        out.append(
            ContactOut(
                id=c.id,
                user_id=u.id,
                email=u.email,
                display_name=(u.profile.display_name if u.profile else u.email),
                avatar_url=(u.profile.avatar_url if u.profile else None),
            )
        )
    return out


@router.post("", response_model=ContactOut)
def add_contact(payload: ContactAddRequest, db: Session = Depends(get_db), current: User = Depends(get_current_user)) -> ContactOut:
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current.id:
        raise HTTPException(status_code=400, detail="Cannot add yourself")

    blocked = (
        db.query(Block)
        .filter(
            (Block.blocker_user_id == current.id) & (Block.blocked_user_id == user.id)
            | ((Block.blocker_user_id == user.id) & (Block.blocked_user_id == current.id))
        )
        .first()
    )
    if blocked:
        raise HTTPException(status_code=403, detail="Blocked")

    existing = (
        db.query(Contact)
        .filter(Contact.owner_user_id == current.id, Contact.contact_user_id == user.id)
        .first()
    )
    if existing:
        c = existing
    else:
        c = Contact(owner_user_id=current.id, contact_user_id=user.id)
        db.add(c)
        db.commit()
        db.refresh(c)

    return ContactOut(
        id=c.id,
        user_id=user.id,
        email=user.email,
        display_name=(user.profile.display_name if user.profile else user.email),
        avatar_url=(user.profile.avatar_url if user.profile else None),
    )


@router.delete("/{contact_id}")
def delete_contact(contact_id: int, db: Session = Depends(get_db), current: User = Depends(get_current_user)) -> dict:
    c = db.query(Contact).filter(Contact.id == contact_id, Contact.owner_user_id == current.id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(c)
    db.commit()
    return {"ok": True}


@router.post("/{user_id}/block")
def block_user(user_id: int, db: Session = Depends(get_db), current: User = Depends(get_current_user)) -> dict:
    if user_id == current.id:
        raise HTTPException(status_code=400, detail="Cannot block yourself")
    existing = db.query(Block).filter(Block.blocker_user_id == current.id, Block.blocked_user_id == user_id).first()
    if not existing:
        b = Block(blocker_user_id=current.id, blocked_user_id=user_id)
        db.add(b)
        db.commit()
    return {"ok": True}

