from __future__ import annotations

import logging
from typing import Optional

from app.models.request_models import PredictPointsRequest, SimulateRequest
from app.models.response_models import (
    BaselineResponse,
    CurvePoint,
    ModelInfo,
    PointPrediction,
    PredictPointsResponse,
    SelectedResult,
    SimulateResponse,
)
from app.services.catalog_service import get_sku_attributes
from app.services.dataset_service import get_dataset
from app.services.historical_price_service import get_historical_price
from app.services.pipeline_service import get_metadata, get_pipeline
from app.utils.error_handler import HistoricalPriceNotFound, InferenceError, ValidationError
from app.utils.feature_builder import build_feature_df

logger = logging.getLogger(__name__)

CURVE_PRICE_STEP = 0.001
CURVE_PRICE_MAX = 10.0
ELASTICITY_DP = 0.001  # fixed price delta for elasticity calculation

_ATTR_FIELDS = [
    "product_sku_code", "top_brand", "flavor_internal",
    "pack_type_internal", "pack_size_internal", "units_per_package_internal",
]


def _filter_features(df, metadata_features: list[str]):
    """Keep only the columns the pipeline expects; raise if any required feature is missing."""
    missing = [c for c in metadata_features if c not in df.columns]
    if missing:
        raise ValidationError(
            message="Missing required features for prediction",
            details=missing,
        )
    return df[metadata_features]


def _compute_elasticity(
    price: float, pipeline, metadata_features, customer, promotion, week, attrs, continuous_week
) -> float:
    """Compute elasticity at a price point using single-sided +0.001 differential."""
    p_plus = price + ELASTICITY_DP
    df = build_feature_df([price, p_plus], customer, promotion, week, attrs, continuous_week)
    df = _filter_features(df, metadata_features)
    try:
        vols = pipeline.predict(df)
        v0 = float(vols[0])
        v_plus = float(vols[1])
    except Exception as exc:
        raise InferenceError(f"Elasticity prediction failed: {exc}")

    if v0 != 0:
        return ((v_plus - v0) / v0) / (ELASTICITY_DP / price)
    return 0.0


def run_simulation(req: SimulateRequest) -> SimulateResponse:
    df = get_dataset()
    pipeline = get_pipeline()
    metadata = get_metadata()
    metadata_features: list[str] = metadata.get("features", [])

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

    # --- Historical price reference (optional) ---
    bl_raw: Optional[dict] = None
    if req.product_sku_code is not None and req.customer is not None:
        try:
            bl_raw = get_historical_price(df, req.product_sku_code, req.customer)
        except HistoricalPriceNotFound:
            logger.info("No historical price found for SKU %s / customer %s", req.product_sku_code, req.customer)

    baseline_price: Optional[float] = None
    baseline_volume: Optional[int] = None
    baseline_yearweek: Optional[int] = None
    baseline_response: Optional[BaselineResponse] = None
    baseline_elast: Optional[float] = None

    if req.baseline_override_price_per_litre is not None:
        baseline_price = req.baseline_override_price_per_litre
        baseline_yearweek = bl_raw["yearweek"] if bl_raw else None
        # Predict volume at the user-input baseline price
        bl_df = build_feature_df([baseline_price], req.customer,
                                 req.promotion_indicator, req.week, attrs,
                                 continuous_week)
        bl_df = _filter_features(bl_df, metadata_features)
        try:
            baseline_volume = int(round(float(pipeline.predict(bl_df)[0])))
        except Exception as exc:
            raise InferenceError(f"Baseline volume prediction failed: {exc}")

        # Compute baseline elasticity
        baseline_elast = _compute_elasticity(
            baseline_price, pipeline, metadata_features, req.customer,
            req.promotion_indicator, req.week, attrs, continuous_week,
        )

    # Build baseline response object if we have price data
    if baseline_price is not None and baseline_volume is not None:
        baseline_response = BaselineResponse(
            yearweek=baseline_yearweek or 0,
            price_per_litre=round(baseline_price, 6),
            volume_units=baseline_volume,
        )

    # --- Curve: fixed 0.001 to 10.0, step 0.001 ---
    all_prices: list[float] = []
    p = CURVE_PRICE_STEP
    while p <= CURVE_PRICE_MAX:
        all_prices.append(round(p, 3))
        p = round(p + CURVE_PRICE_STEP, 3)

    # Batch predict for entire curve
    curve_df = build_feature_df(all_prices, req.customer,
                                req.promotion_indicator, req.week, attrs,
                                continuous_week)
    curve_df = _filter_features(curve_df, metadata_features)
    try:
        curve_volumes = pipeline.predict(curve_df)
    except Exception as exc:
        raise InferenceError(f"Curve prediction failed: {exc}")

    # Build price -> volume mapping
    price_to_vol: dict[float, float] = {}
    for price, vol in zip(all_prices, curve_volumes):
        price_to_vol[round(price, 4)] = float(vol)

    # Build curve points sorted by price
    curve_points: list[CurvePoint] = []
    for price in all_prices:
        vol = price_to_vol[round(price, 4)]
        curve_points.append(CurvePoint(
            price_per_litre=round(price, 4),
            predicted_volume_units=round(vol, 2),
        ))

    # --- Selected point (only when a price input is provided) ---
    has_price_input = (req.selected_new_price_per_litre is not None
                       or req.selected_price_change_pct is not None)

    selected_result: Optional[SelectedResult] = None
    arc_elast: Optional[float] = None

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
        v0_df = build_feature_df([p0], req.customer,
                                 req.promotion_indicator, req.week, attrs,
                                 continuous_week)
        v0_df = _filter_features(v0_df, metadata_features)
        try:
            v0 = float(pipeline.predict(v0_df)[0])
        except Exception as exc:
            raise InferenceError(f"Selected-point prediction failed: {exc}")

        # Elasticity at selected price (single-sided +0.001)
        elasticity = _compute_elasticity(
            p0, pipeline, metadata_features, req.customer,
            req.promotion_indicator, req.week, attrs, continuous_week,
        )

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

        # Arc elasticity between baseline and selected (only when both exist)
        if baseline_price is not None and baseline_volume is not None:
            dp = p0 - baseline_price
            if dp != 0 and baseline_volume != 0:
                arc_elast = round(
                    ((v0 - baseline_volume) / baseline_volume) / (dp / baseline_price),
                    6,
                )

    # --- Warnings ---
    warnings: list[str] = []
    if bl_raw is None and req.product_sku_code is not None:
        warnings.append("No historical price data found for this SKU + customer combination")
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
        baseline_elasticity=round(baseline_elast, 6) if baseline_elast is not None else None,
        selected=selected_result,
        arc_elasticity=arc_elast,
        curve=curve_points,
    )


def predict_points(req: PredictPointsRequest) -> PredictPointsResponse:
    """Lightweight prediction at 1-2 price points without regenerating the full curve."""
    df = get_dataset()
    pipeline = get_pipeline()
    metadata = get_metadata()
    metadata_features: list[str] = metadata.get("features", [])

    if "continuous_week" in df.columns:
        continuous_week = int(df["continuous_week"].max()) + 1
    else:
        continuous_week = 0

    attrs: dict = {}
    for field in _ATTR_FIELDS:
        val = getattr(req, field, None)
        if val is not None:
            attrs[field] = val

    if req.product_sku_code is not None:
        sku_row = get_sku_attributes(df, req.product_sku_code)
        if sku_row is not None:
            attrs.setdefault("material_medium_description", sku_row["material_medium_description"])

    baseline_pred: Optional[PointPrediction] = None
    selected_pred: Optional[PointPrediction] = None
    arc_elast: Optional[float] = None

    bl_vol: Optional[float] = None
    sel_vol: Optional[float] = None

    if req.baseline_price is not None:
        bl_df = build_feature_df([req.baseline_price], req.customer,
                                 req.promotion_indicator, req.week, attrs,
                                 continuous_week)
        bl_df = _filter_features(bl_df, metadata_features)
        try:
            bl_vol = float(pipeline.predict(bl_df)[0])
        except Exception as exc:
            raise InferenceError(f"Baseline prediction failed: {exc}")

        bl_elast = _compute_elasticity(
            req.baseline_price, pipeline, metadata_features, req.customer,
            req.promotion_indicator, req.week, attrs, continuous_week,
        )
        baseline_pred = PointPrediction(
            price_per_litre=round(req.baseline_price, 6),
            predicted_volume=round(bl_vol, 2),
            elasticity=round(bl_elast, 6),
        )

    if req.selected_price is not None:
        sel_df = build_feature_df([req.selected_price], req.customer,
                                  req.promotion_indicator, req.week, attrs,
                                  continuous_week)
        sel_df = _filter_features(sel_df, metadata_features)
        try:
            sel_vol = float(pipeline.predict(sel_df)[0])
        except Exception as exc:
            raise InferenceError(f"Selected prediction failed: {exc}")

        sel_elast = _compute_elasticity(
            req.selected_price, pipeline, metadata_features, req.customer,
            req.promotion_indicator, req.week, attrs, continuous_week,
        )
        selected_pred = PointPrediction(
            price_per_litre=round(req.selected_price, 6),
            predicted_volume=round(sel_vol, 2),
            elasticity=round(sel_elast, 6),
        )

    if bl_vol is not None and sel_vol is not None and req.baseline_price is not None and req.selected_price is not None:
        dp = req.selected_price - req.baseline_price
        if dp != 0 and bl_vol != 0:
            arc_elast = round(((sel_vol - bl_vol) / bl_vol) / (dp / req.baseline_price), 6)

    return PredictPointsResponse(
        baseline=baseline_pred,
        selected=selected_pred,
        arc_elasticity=arc_elast,
    )
