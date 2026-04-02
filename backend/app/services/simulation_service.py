from __future__ import annotations

import logging
from typing import Optional

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
from app.utils.error_handler import BaselineNotFound, InferenceError, ValidationError
from app.utils.feature_builder import build_feature_df

logger = logging.getLogger(__name__)

CURVE_PRICE_STEP = 0.001

_ATTR_FIELDS = [
    "product_sku_code", "top_brand", "flavor_internal",
    "pack_type_internal", "pack_size_internal", "units_per_package_internal",
]


def run_simulation(req: SimulateRequest) -> SimulateResponse:
    df = get_dataset(req.dataset_id)
    pipeline = get_pipeline()
    metadata = get_metadata()

    # Derive continuous_week: max from dataset + 1 (next unseen week)
    if "continuous_week" in df.columns:
        continuous_week = int(df["continuous_week"].max()) + 1
    else:
        continuous_week = 0

    # --- Build attrs from request (only non-None values) ---
    attrs: dict = {}
    for field in _ATTR_FIELDS:
        val = getattr(req, field)
        if val is not None:
            attrs[field] = val

    # If SKU provided, try to look up material_medium_description from dataset
    if req.product_sku_code is not None:
        sku_row = get_sku_attributes(df, req.product_sku_code)
        if sku_row is not None:
            attrs.setdefault("material_medium_description", sku_row["material_medium_description"])

    # --- Baseline (optional) ---
    bl_raw: Optional[dict] = None
    if req.product_sku_code is not None:
        try:
            bl_raw = get_baseline(df, req.product_sku_code, req.customer)
        except BaselineNotFound:
            logger.info("No baseline found for SKU %s / customer %s", req.product_sku_code, req.customer)

    baseline_price: Optional[float] = None
    baseline_volume: Optional[int] = None
    baseline_yearweek: Optional[int] = None
    baseline_response: Optional[BaselineResponse] = None

    if req.baseline_override_price_per_litre is not None:
        baseline_price = req.baseline_override_price_per_litre
        baseline_yearweek = bl_raw["yearweek"] if bl_raw else None
        # Predict volume at the overridden baseline price
        try:
            bl_df = build_feature_df([baseline_price], req.customer,
                                     req.promotion_indicator, req.week, attrs,
                                     continuous_week)
            baseline_volume = int(round(float(pipeline.predict(bl_df)[0])))
        except Exception as exc:
            raise InferenceError(f"Baseline volume prediction failed: {exc}")
    elif bl_raw is not None:
        baseline_price = bl_raw["price_per_litre"]
        baseline_volume = bl_raw["volume_units"]
        baseline_yearweek = bl_raw["yearweek"]

    # Build baseline response object if we have price data
    if baseline_price is not None and baseline_volume is not None:
        baseline_response = BaselineResponse(
            yearweek=baseline_yearweek or 0,
            price_per_litre=round(baseline_price, 6),
            volume_units=baseline_volume,
        )

    # --- Curve: −100% to +100% of baseline, step 0.001 ---
    all_prices: list[float] = []

    if baseline_price is not None:
        p_start = CURVE_PRICE_STEP  # −100% clamps to 0; minimum valid price at 3dp
        p_end = round(baseline_price * 2.0, 3)
    else:
        price_meta = metadata.get("price_per_litre", {})
        p_start = round(price_meta.get("p1", 0.5), 3)
        p_end = round(price_meta.get("p99", 7.0), 3)

    p = p_start
    while p <= p_end:
        all_prices.append(p)
        p = round(p + CURVE_PRICE_STEP, 3)

    all_prices_sorted = all_prices

    # Batch predict for entire curve
    try:
        curve_df = build_feature_df(all_prices_sorted, req.customer,
                                    req.promotion_indicator, req.week, attrs,
                                    continuous_week)
        curve_volumes = pipeline.predict(curve_df)
    except Exception as exc:
        raise InferenceError(f"Curve prediction failed: {exc}")

    # Build price -> volume mapping
    price_to_vol: dict[float, float] = {}
    for price, vol in zip(all_prices_sorted, curve_volumes):
        price_to_vol[round(price, 4)] = float(vol)

    # Build curve points sorted by price
    curve_points: list[CurvePoint] = []
    for price in all_prices_sorted:
        vol = price_to_vol[round(price, 4)]
        if baseline_price is not None and baseline_price > 0:
            pct = (price / baseline_price - 1) * 100
        else:
            pct = 0.0
        curve_points.append(CurvePoint(
            price_change_pct=round(pct, 4),
            price_per_litre=round(price, 4),
            predicted_volume_units=round(vol, 2),
        ))

    # --- Selected point (only when a price input is provided) ---
    has_price_input = (req.selected_new_price_per_litre is not None
                       or req.selected_price_change_pct is not None)

    selected_result: Optional[SelectedResult] = None

    if has_price_input:
        if req.selected_new_price_per_litre is not None:
            p0 = req.selected_new_price_per_litre
            if baseline_price is not None and baseline_price > 0:
                selected_pct = (p0 / baseline_price - 1) * 100
            else:
                selected_pct = 0.0
        else:
            selected_pct = req.selected_price_change_pct  # type: ignore[assignment]
            if baseline_price is not None and baseline_price > 0:
                p0 = max(0.01, baseline_price * (1 + selected_pct / 100))
            else:
                raise ValidationError("Cannot use percentage-based pricing without a baseline. Provide selected_new_price_per_litre or a baseline_override_price_per_litre.")

        # Predict V0
        try:
            v0_df = build_feature_df([p0], req.customer,
                                     req.promotion_indicator, req.week, attrs,
                                     continuous_week)
            v0 = float(pipeline.predict(v0_df)[0])
        except Exception as exc:
            raise InferenceError(f"Selected-point prediction failed: {exc}")

        # --- Elasticity (local +/-1% differential) ---
        p_minus = max(0.01, p0 * 0.99)
        p_plus = p0 * 1.01

        try:
            elast_prices = [p_minus, p_plus]
            elast_df = build_feature_df(elast_prices, req.customer,
                                        req.promotion_indicator, req.week, attrs,
                                        continuous_week)
            elast_vols = pipeline.predict(elast_df)
            v_minus = float(elast_vols[0])
            v_plus = float(elast_vols[1])
        except Exception as exc:
            raise InferenceError(f"Elasticity prediction failed: {exc}")

        if p_minus == p0:
            if v0 != 0 and (p_plus - p0) != 0:
                elasticity = ((v_plus - v0) / v0) / ((p_plus - p0) / p0)
            else:
                elasticity = 0.0
        else:
            if v0 != 0 and (p_plus - p_minus) != 0:
                elasticity = ((v_plus - v_minus) / v0) / ((p_plus - p_minus) / p0)
            else:
                elasticity = 0.0

        # Delta from baseline (0 if no baseline)
        if baseline_volume is not None:
            delta_vol = v0 - baseline_volume
            delta_pct = delta_vol / baseline_volume if baseline_volume != 0 else 0.0
        else:
            delta_vol = 0.0
            delta_pct = 0.0

        selected_result = SelectedResult(
            price_change_pct=round(selected_pct, 4),
            new_price_per_litre=round(p0, 6),
            predicted_volume_units=round(v0, 2),
            delta_volume_units=round(delta_vol, 2),
            delta_volume_pct=round(delta_pct, 6),
            elasticity=round(elasticity, 6),
        )

    # --- Warnings ---
    warnings: list[str] = []
    if bl_raw is None:
        warnings.append("No baseline data found for this SKU + customer combination")
    if has_price_input:
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
        baseline=baseline_response,
        selected=selected_result,
        curve=curve_points,
    )
