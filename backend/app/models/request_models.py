from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator


VALID_CUSTOMERS = ["L2_ASDA", "L2_CRTG", "L2_MORRISONS", "L2_SAINSBURY'S", "L2_TESCO"]

CustomerEnum = Literal["L2_ASDA", "L2_CRTG", "L2_MORRISONS", "L2_SAINSBURY'S", "L2_TESCO"]


class SimulateRequest(BaseModel):
    dataset_id: str
    product_sku_code: int
    customer: CustomerEnum
    promotion_indicator: Literal[0, 1]
    week: int = Field(..., ge=1, le=52)
    baseline_override_price_per_litre: Optional[float] = Field(None, ge=0.01)
    selected_price_change_pct: Optional[float] = Field(None, ge=-100, le=100)
    selected_new_price_per_litre: Optional[float] = Field(None, ge=0.01)

    @model_validator(mode="after")
    def check_price_input(self):
        if self.selected_new_price_per_litre is None and self.selected_price_change_pct is None:
            raise ValueError("Either selected_new_price_per_litre or selected_price_change_pct is required")
        return self


class SkuLookupRequest(BaseModel):
    dataset_id: str
    top_brand: str
    flavor_internal: str
    pack_type_internal: str
    pack_size_internal: int
    units_per_package_internal: int
