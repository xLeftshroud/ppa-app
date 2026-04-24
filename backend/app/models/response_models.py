from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, ConfigDict


class SkuItem(BaseModel):
    product_sku_code: int
    material_medium_description: str
    top_brand: str
    flavor_internal: str
    pack_type_internal: str
    pack_size_internal: int
    units_per_package_internal: int


class SkuListResponse(BaseModel):
    items: list[SkuItem]


class HistoricalPriceResponse(BaseModel):
    yearweek: int
    price_per_litre: float
    volume_units: int


class BaselineResponse(BaseModel):
    yearweek: int
    price_per_litre: float
    volume_units: int


class CurvePoint(BaseModel):
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


class PointPrediction(BaseModel):
    price_per_litre: float
    predicted_volume: float
    elasticity: float


class PredictPointsResponse(BaseModel):
    baseline: Optional[PointPrediction] = None
    selected: Optional[PointPrediction] = None
    arc_elasticity: Optional[float] = None


class SimulateResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    model_info: ModelInfo
    warnings: list[str]
    baseline: Optional[BaselineResponse] = None
    baseline_elasticity: Optional[float] = None
    selected: Optional[SelectedResult] = None
    arc_elasticity: Optional[float] = None
    curve: list[CurvePoint]


class InfoResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    model_path: str
    metadata_path: str
    training_data_path: str
    model_type: Optional[str] = None
    feature_cols: list[str] = []
    using_dummy_pipeline: bool = False
