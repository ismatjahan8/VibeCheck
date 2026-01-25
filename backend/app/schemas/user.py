from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field


class ProfileOut(BaseModel):
    display_name: str = ""
    avatar_url: str | None = None
    status: str = ""


class UserOut(BaseModel):
    id: int
    email: EmailStr
    profile: ProfileOut


class ProfileUpdate(BaseModel):
    display_name: str | None = Field(default=None, max_length=120)
    avatar_url: str | None = Field(default=None, max_length=1024)
    status: str | None = Field(default=None, max_length=280)

