from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class ErrorDetail(BaseModel):
    row: int | None = None
    column: str | None = None
    reason: str


class ErrorBody(BaseModel):
    code: str
    message: str
    details: list[Any] = []
    request_id: str = ""


class ErrorEnvelope(BaseModel):
    error: ErrorBody
