from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class AppStateSnapshot(BaseModel):
    dataset_id: str | None = None
    selected_sku: int | None = None
    sku_description: str | None = None
    brand: str | None = None
    flavor: str | None = None
    pack_type: str | None = None
    pack_size: int | None = None
    units_pkg: int | None = None
    customer: str | None = None
    promotion: Literal[0, 1] = 0
    week: int = 1
    baseline_price: float | None = None
    baseline_volume: int | None = None
    baseline_override: float | None = None
    price_change_pct: float = 0
    selected_new_price: float | None = None
    has_simulation_result: bool = False
    last_predicted_volume: float | None = None
    last_elasticity: float | None = None
    last_delta_volume_pct: float | None = None


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    conversation_history: list[ChatMessage] = []
    app_state: AppStateSnapshot = AppStateSnapshot()


class UIAction(BaseModel):
    action: str
    params: dict = {}


class SuggestedAction(BaseModel):
    label: str
    message: str


class ChatResponse(BaseModel):
    assistant_message: str
    ui_actions: list[UIAction] = []
    suggested_actions: list[SuggestedAction] = []
