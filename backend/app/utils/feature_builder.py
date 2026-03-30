from __future__ import annotations

import math

import pandas as pd


def build_feature_df(
    prices: list[float],
    customer: str,
    promotion_indicator: int,
    week: int,
    attrs: dict,
    continuous_week: int = 0,
) -> pd.DataFrame:
    week_sin = math.sin(2 * math.pi * week / 52)
    week_cos = math.cos(2 * math.pi * week / 52)

    base = {
        "customer": customer,
        "promotion_indicator": promotion_indicator,
        "week_sin": week_sin,
        "week_cos": week_cos,
        "continuous_week": continuous_week,
    }
    # Include only non-None attribute values from frontend
    for key, val in attrs.items():
        base[key] = val

    rows = []
    for price in prices:
        row = {**base, "price_per_litre": price}
        rows.append(row)
    return pd.DataFrame(rows)
