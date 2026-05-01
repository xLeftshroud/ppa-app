from __future__ import annotations

from pydantic import BaseModel, Field


class ScatterFilter(BaseModel):
    column: str
    value: str


class ScatterRequest(BaseModel):
    filters: list[ScatterFilter] = Field(..., min_length=1)


class ScatterPoint(BaseModel):
    price_per_litre: float
    volume_in_litres: float


class ScatterResponse(BaseModel):
    points: list[ScatterPoint]
    count: int
