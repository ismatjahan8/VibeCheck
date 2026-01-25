from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field


class ContactOut(BaseModel):
    id: int
    user_id: int
    email: str
    display_name: str
    avatar_url: str | None = None


class ConversationCreate(BaseModel):
    type: str = Field(pattern="^(direct|group)$")
    title: str | None = Field(default=None, max_length=120)
    member_user_ids: list[int] = Field(default_factory=list)


class ConversationOut(BaseModel):
    id: int
    type: str
    title: str | None = None
    member_user_ids: list[int]


class MessageCreate(BaseModel):
    body: str = Field(default="", max_length=10000)
    attachment_ids: list[int] = Field(default_factory=list)


class AttachmentOut(BaseModel):
    id: int
    kind: str
    url: str
    mime_type: str | None = None
    size: int | None = None


class MessageOut(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    body: str
    created_at: datetime
    attachments: list[AttachmentOut] = Field(default_factory=list)


class ReceiptUpdate(BaseModel):
    status: str = Field(pattern="^(delivered|read)$")

