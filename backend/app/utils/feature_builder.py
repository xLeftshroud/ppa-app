"""Inference-side feature helper.

Training-side transforms live in app.ml.features (verbatim mirror of the
ppa-ml feature_engineering.py). This module only adds the inference helper
that builds a DataFrame for a list of candidate prices at fixed SKU attrs.
"""
from __future__ import annotations

import pandas as pd

from app.ml.features import (
    log_price_per_litre,
    pack_size_total,
    pack_tier,
    week_cos,
    week_sin,
)


def build_feature_df(prices: list[float], attrs: dict) -> pd.DataFrame:
    rows = [{**attrs, "price_per_litre": p} for p in prices]
    df = pd.DataFrame(rows)

    if "week" in df.columns:
        df["week_sin"] = week_sin(df)
        df["week_cos"] = week_cos(df)

    if {"pack_size_internal", "units_per_package_internal"}.issubset(df.columns):
        df["pack_size_total"] = pack_size_total(df)
        df["pack_tier"] = pack_tier(df)

    df["log_price_per_litre"] = log_price_per_litre(df)
    return df
