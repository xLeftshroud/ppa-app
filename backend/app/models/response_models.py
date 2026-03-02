from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, ConfigDict


class UploadResponse(BaseModel):
    dataset_id: str
    row_count: int
    sku_count: int
    customer_values: list[str]
    message: str = "uploaded"


class SkuItem(BaseModel):
    product_sku_code: int
    top_brand: str
    flavor_internal: str
    pack_type_internal: str
    pack_size_internal: int
    units_per_package_internal: int


class SkuListResponse(BaseModel):
    items: list[SkuItem]


class BaselineResponse(BaseModel):
    yearweek: int
    price_per_litre: float
    volume_units: int


class CurvePoint(BaseModel):
    price_change_pct: float
    price_per_litre: float
    predicted_volume_units: float


class SelectedResult(BaseModel):
    price_change_pct: float
    new_price_per_litre: float
    predicted_volume_units: float
    delta_volume_units: float
    delta_volume_pct: float
    elasticity: float


class ModelInfo(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    model_name: str
    model_version: str
    features_version: str


class SimulateResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    model_info: ModelInfo
    warnings: list[str]
    baseline: Optional[BaselineResponse] = None
    selected: SelectedResult
    curve: list[CurvePoint]
