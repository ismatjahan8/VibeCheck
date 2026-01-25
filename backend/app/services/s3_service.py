from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import boto3

from app.core.config import settings


def _client():
    if not (settings.S3_BUCKET and settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY):
        raise RuntimeError("S3 is not configured")
    return boto3.client(
        "s3",
        region_name=settings.S3_REGION,
        endpoint_url=settings.S3_ENDPOINT_URL,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )


@dataclass
class PresignResult:
    method: Literal["PUT"]
    url: str
    headers: dict[str, str]
    public_url: str


def presign_put(key: str, content_type: str, expires_seconds: int = 60) -> PresignResult:
    c = _client()
    url = c.generate_presigned_url(
        "put_object",
        Params={"Bucket": settings.S3_BUCKET, "Key": key, "ContentType": content_type},
        ExpiresIn=expires_seconds,
    )

    if settings.S3_PUBLIC_BASE_URL:
        public_url = f"{settings.S3_PUBLIC_BASE_URL.rstrip('/')}/{key}"
    elif settings.S3_ENDPOINT_URL:
        # Works for many S3-compatible endpoints, but you may want S3_PUBLIC_BASE_URL for a clean CDN URL.
        public_url = f"{settings.S3_ENDPOINT_URL.rstrip('/')}/{settings.S3_BUCKET}/{key}"
    else:
        public_url = f"https://{settings.S3_BUCKET}.s3.amazonaws.com/{key}"

    return PresignResult(method="PUT", url=url, headers={"Content-Type": content_type}, public_url=public_url)

