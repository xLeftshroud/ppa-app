from __future__ import annotations

import logging

from app.models.scatter_models import ScatterFilter, ScatterPoint
from app.services.price_range_service import get_training_df
from app.utils.error_handler import ValidationError

logger = logging.getLogger(__name__)

ALLOWED_COLUMNS = {
    "product_sku_code",
    "customer",
    "top_brand",
    "flavor_internal",
    "pack_type_internal",
    "pack_size_internal",
    "units_per_package_internal",
    "promotion_indicator",
}


def get_scatter_points(filters: list[ScatterFilter]) -> tuple[list[ScatterPoint], int]:
    df = get_training_df()
    if df is None:
        raise ValidationError("Training data not loaded")

    # Validate columns
    for f in filters:
        if f.column not in ALLOWED_COLUMNS:
            raise ValidationError(f"Column '{f.column}' is not allowed for filtering")
        if f.column not in df.columns:
            raise ValidationError(f"Column '{f.column}' not found in training data")

    # Apply AND filters
    mask = df.index >= 0  # all True
    for f in filters:
        col_dtype = df[f.column].dtype
        if col_dtype in ("int64", "int32"):
            mask = mask & (df[f.column] == int(f.value))
        elif col_dtype in ("float64", "float32"):
            mask = mask & (df[f.column] == float(f.value))
        else:
            mask = mask & (df[f.column].astype(str) == f.value)

    filtered = df.loc[mask, ["price_per_litre", "nielsen_total_volume"]].dropna()
    points = [
        ScatterPoint(
            price_per_litre=float(row.price_per_litre),
            nielsen_total_volume=float(row.nielsen_total_volume),
        )
        for row in filtered.itertuples()
    ]
    logger.info("Scatter query: %d filters → %d points", len(filters), len(points))
    return points, len(points)
