from __future__ import annotations

import logging
from typing import Any

import numpy as np

from app.models.request_models import SimulateRequest
from app.models.response_models import (
    BaselineResponse,
    CurvePoint,
    ModelInfo,
    SelectedResult,
    SimulateResponse,
)
from app.services.baseline_service import get_baseline
from app.services.catalog_service import get_sku_attributes
from app.services.dataset_service import get_dataset
from app.services.pipeline_service import get_metadata, get_pipeline
from app.utils.error_handler import InferenceError, ValidationError
from app.utils.feature_builder import build_feature_df

logger = logging.getLogger(__name__)


def run_simulation(req: SimulateRequest) -> SimulateResponse:
    df = get_dataset(req.dataset_id)
    pipeline = get_pipeline()
    metadata = get_metadata()

    # --- SKU attributes ---
    sku_attrs = get_sku_attributes(df, req.product_sku_code)
    if sku_attrs is None:
        raise ValidationError(f"SKU {req.product_sku_code} not found in dataset")

    # --- Baseline ---
    bl_raw = get_baseline(df, req.product_sku_code, req.customer)
    baseline_yearweek = bl_raw["yearweek"]

    if req.baseline_override_price_per_litre is not None:
        baseline_price = req.baseline_override_price_per_litre
        # Predict volume at the overridden baseline price
        try:
            bl_df = build_feature_df([baseline_price], req.customer,
                                     req.promotion_indicator, req.week, sku_attrs)
            baseline_volume = int(round(float(pipeline.predict(bl_df)[0])))
        except Exception as exc:
            raise InferenceError(f"Baseline volume prediction failed: {exc}")
    else:
        baseline_price = bl_raw["price_per_litre"]
        baseline_volume = bl_raw["volume_units"]

    # --- 41-point curve ---
    pct_grid = list(range(-100, 105, 5))  # [-100, -95, ..., 0, ..., 95, 100]
    price_list = [max(0.01, baseline_price * (1 + pct / 100)) for pct in pct_grid]

    # Deduplicate prices (keep mapping from pct to price)
    unique_prices: list[float] = []
    seen: set[float] = set()
    for p in price_list:
        rounded = round(p, 6)
        if rounded not in seen:
            seen.add(rounded)
            unique_prices.append(p)

    # Batch predict for curve
    try:
        curve_df = build_feature_df(unique_prices, req.customer,
                                    req.promotion_indicator, req.week, sku_attrs)
        curve_volumes = pipeline.predict(curve_df)
    except Exception as exc:
        raise InferenceError(f"Curve prediction failed: {exc}")

    # Map unique prices back to volumes
    price_to_vol: dict[float, float] = {}
    for price, vol in zip(unique_prices, curve_volumes):
        price_to_vol[round(price, 6)] = float(vol)

    curve_points: list[CurvePoint] = []
    for pct, price in zip(pct_grid, price_list):
        vol = price_to_vol[round(price, 6)]
        curve_points.append(CurvePoint(
            price_change_pct=float(pct),
            price_per_litre=round(price, 6),
            predicted_volume_units=round(vol, 2),
        ))

    # --- Selected point ---
    if req.selected_new_price_per_litre is not None:
        p0 = req.selected_new_price_per_litre
        selected_pct = (p0 / baseline_price - 1) * 100 if baseline_price > 0 else 0.0
    else:
        selected_pct = req.selected_price_change_pct  # type: ignore[assignment]
        p0 = max(0.01, baseline_price * (1 + selected_pct / 100))

    # Predict V0
    try:
        v0_df = build_feature_df([p0], req.customer,
                                 req.promotion_indicator, req.week, sku_attrs)
        v0 = float(pipeline.predict(v0_df)[0])
    except Exception as exc:
        raise InferenceError(f"Selected-point prediction failed: {exc}")

    # --- Elasticity (local ±1% differential) ---
    p_minus = max(0.01, p0 * 0.99)
    p_plus = p0 * 1.01

    try:
        elast_prices = [p_minus, p_plus]
        elast_df = build_feature_df(elast_prices, req.customer,
                                    req.promotion_indicator, req.week, sku_attrs)
        elast_vols = pipeline.predict(elast_df)
        v_minus = float(elast_vols[0])
        v_plus = float(elast_vols[1])
    except Exception as exc:
        raise InferenceError(f"Elasticity prediction failed: {exc}")

    if p_minus == p0:
        # One-sided difference (clamped at 0.01)
        if v0 != 0 and (p_plus - p0) != 0:
            elasticity = ((v_plus - v0) / v0) / ((p_plus - p0) / p0)
        else:
            elasticity = 0.0
    else:
        # Center difference
        if v0 != 0 and (p_plus - p_minus) != 0:
            elasticity = ((v_plus - v_minus) / v0) / ((p_plus - p_minus) / p0)
        else:
            elasticity = 0.0

    delta_vol = v0 - baseline_volume
    delta_pct = delta_vol / baseline_volume if baseline_volume != 0 else 0.0

    # --- Warnings ---
    warnings: list[str] = []
    price_meta = metadata.get("price_per_litre", {})
    p1 = price_meta.get("p1", 0.0)
    p99 = price_meta.get("p99", 999.0)
    if p0 < p1:
        warnings.append(f"Selected price ({p0:.4f}) is below training distribution p1 ({p1})")
    if p0 > p99:
        warnings.append(f"Selected price ({p0:.4f}) is above training distribution p99 ({p99})")

    return SimulateResponse(
        model_info=ModelInfo(
            model_name=metadata.get("model_name", "PPA_PIPELINE"),
            model_version=metadata.get("model_version", "unknown"),
            features_version=metadata.get("features_version", "v1"),
        ),
        warnings=warnings,
        baseline=BaselineResponse(
            yearweek=baseline_yearweek,
            price_per_litre=round(baseline_price, 6),
            volume_units=baseline_volume,
        ),
        selected=SelectedResult(
            price_change_pct=round(selected_pct, 4),
            new_price_per_litre=round(p0, 6),
            predicted_volume_units=round(v0, 2),
            delta_volume_units=round(delta_vol, 2),
            delta_volume_pct=round(delta_pct, 6),
            elasticity=round(elasticity, 6),
        ),
        curve=curve_points,
    )
