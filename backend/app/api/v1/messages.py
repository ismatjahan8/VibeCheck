from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_current_user
from app.db.database import get_db
from app.models.attachment import Attachment
from app.models.conversation_member import ConversationMember
from app.models.message import Message
from app.models.message_receipt import MessageReceipt
from app.models.user import User
from app.schemas.chat import MessageCreate, MessageOut, ReceiptUpdate
from app.services.realtime import hub

router = APIRouter(prefix="/messages", tags=["messages"])


def _ensure_member(db: Session, conversation_id: int, user_id: int) -> ConversationMember:
    m = db.query(ConversationMember).filter_by(conversation_id=conversation_id, user_id=user_id).first()
    if not m:
        raise HTTPException(status_code=403, detail="Not a member")
    return m


@router.get("/conversation/{conversation_id}", response_model=list[MessageOut])
def list_messages(
    conversation_id: int,
    limit: int = Query(default=50, ge=1, le=200),
    before_id: int | None = None,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[MessageOut]:
    _ensure_member(db, conversation_id, current.id)

    q = (
        db.query(Message)
        .options(joinedload(Message.attachments))
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.id.desc())
    )
    if before_id is not None:
        q = q.filter(Message.id < before_id)
    msgs = q.limit(limit).all()
    msgs.reverse()

    out: list[MessageOut] = []
    for m in msgs:
        out.append(
            MessageOut(
                id=m.id,
                conversation_id=m.conversation_id,
                sender_id=m.sender_id,
                body=m.body,
                created_at=m.created_at,
                attachments=[
                    {
                        "id": a.id,
                        "kind": a.kind,
                        "url": a.url,
                        "mime_type": a.mime_type,
                        "size": a.size,
                    }
                    for a in m.attachments
                ],
            )
        )
    return out


@router.post("/conversation/{conversation_id}", response_model=MessageOut)
async def send_message(
    conversation_id: int,
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> MessageOut:
    _ensure_member(db, conversation_id, current.id)

    msg = Message(conversation_id=conversation_id, sender_id=current.id, body=payload.body or "")
    db.add(msg)
    db.flush()

    if payload.attachment_ids:
        attachments = db.query(Attachment).filter(Attachment.id.in_(payload.attachment_ids)).all()
        for a in attachments:
            a.message_id = msg.id
            db.add(a)

    # Create delivered receipts for other members
    members = db.query(ConversationMember).filter_by(conversation_id=conversation_id).all()
    recipients = [m.user_id for m in members if m.user_id != current.id]
    for uid in recipients:
        db.add(MessageReceipt(message_id=msg.id, user_id=uid, status="delivered"))

    db.commit()
    db.refresh(msg)

    event = {
        "type": "message:new",
        "conversation_id": conversation_id,
        "message": {
            "id": msg.id,
            "conversation_id": msg.conversation_id,
            "sender_id": msg.sender_id,
            "body": msg.body,
            "created_at": msg.created_at.isoformat(),
            "attachments": [
                {"id": a.id, "kind": a.kind, "url": a.url, "mime_type": a.mime_type, "size": a.size}
                for a in msg.attachments
            ],
        },
        "recipients": [current.id, *recipients],
    }
    await hub.publish(event)

    return MessageOut(
        id=msg.id,
        conversation_id=msg.conversation_id,
        sender_id=msg.sender_id,
        body=msg.body,
        created_at=msg.created_at,
        attachments=[
            {"id": a.id, "kind": a.kind, "url": a.url, "mime_type": a.mime_type, "size": a.size}
            for a in msg.attachments
        ],
    )


@router.post("/{message_id}/receipt")
async def update_receipt(
    message_id: int,
    payload: ReceiptUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> dict:
    msg = db.get(Message, message_id)
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    _ensure_member(db, msg.conversation_id, current.id)

    receipt = db.query(MessageReceipt).filter_by(message_id=message_id, user_id=current.id).first()
    if not receipt:
        receipt = MessageReceipt(message_id=message_id, user_id=current.id, status=payload.status)
    else:
        receipt.status = payload.status
    db.add(receipt)
    db.commit()

    members = db.query(ConversationMember).filter_by(conversation_id=msg.conversation_id).all()
    recipients = [m.user_id for m in members]
    await hub.publish(
        {
            "type": "receipt:update",
            "conversation_id": msg.conversation_id,
            "message_id": message_id,
            "user_id": current.id,
            "status": payload.status,
            "recipients": recipients,
        }
    )
    return {"ok": True}

