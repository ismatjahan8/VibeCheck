from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.database import get_db
from app.models.attachment import Attachment
from app.models.user import User
from app.services.s3_service import presign_put

router = APIRouter(prefix="/uploads", tags=["uploads"])


class PresignRequest(BaseModel):
    content_type: str = Field(min_length=3, max_length=255)
    kind: str = Field(default="file", max_length=32)
    filename: str = Field(default="file", max_length=255)


class PresignResponse(BaseModel):
    upload_method: str
    upload_url: str
    upload_headers: dict[str, str]
    attachment_id: int
    public_url: str


@router.post("/presign", response_model=PresignResponse)
def create_presign(
    payload: PresignRequest,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> PresignResponse:
    # Key: user/date/filename-timestamp
    safe_name = payload.filename.replace("/", "_").replace("\\", "_")
    key = f"uploads/{current.id}/{datetime.utcnow().strftime('%Y%m%d')}/{int(datetime.utcnow().timestamp())}-{safe_name}"

    try:
        presigned = presign_put(key=key, content_type=payload.content_type)
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))

    attachment = Attachment(
        message_id=None,  # set when message created
        kind=payload.kind,
        url=presigned.public_url,
        mime_type=payload.content_type,
        size=None,
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)

    return PresignResponse(
        upload_method=presigned.method,
        upload_url=presigned.url,
        upload_headers=presigned.headers,
        attachment_id=attachment.id,
        public_url=presigned.public_url,
    )

