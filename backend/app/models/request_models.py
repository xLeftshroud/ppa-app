from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


VALID_CUSTOMERS = ["L2_ASDA", "L2_CRTG", "L2_MORRISONS", "L2_SAINSBURY'S", "L2_TESCO"]


class SimulateRequest(BaseModel):
    dataset_id: str
    product_sku_code: Optional[int] = None
    customer: Optional[str] = None
    promotion_indicator: Literal[0, 1] = 0
    week: Optional[int] = Field(None, ge=1, le=52)
    top_brand: Optional[str] = None
    flavor_internal: Optional[str] = None
    pack_type_internal: Optional[str] = None
    pack_size_internal: Optional[int] = None
    units_per_package_internal: Optional[int] = None
    baseline_override_price_per_litre: Optional[float] = Field(None, ge=0.01)
    selected_price_change_pct: Optional[float] = Field(None, ge=-100, le=100)
    selected_new_price_per_litre: Optional[float] = Field(None, ge=0.01)


class PredictPointsRequest(BaseModel):
    dataset_id: str
    product_sku_code: Optional[int] = None
    customer: Optional[str] = None
    promotion_indicator: Literal[0, 1] = 0
    week: Optional[int] = Field(None, ge=1, le=52)
    top_brand: Optional[str] = None
    flavor_internal: Optional[str] = None
    pack_type_internal: Optional[str] = None
    pack_size_internal: Optional[int] = None
    units_per_package_internal: Optional[int] = None
    baseline_price: Optional[float] = Field(None, ge=0.01)
    selected_price: Optional[float] = Field(None, ge=0.01)


class SkuLookupRequest(BaseModel):
    dataset_id: str
    top_brand: str
    flavor_internal: str
    pack_type_internal: str
    pack_size_internal: int
    units_per_package_internal: int
