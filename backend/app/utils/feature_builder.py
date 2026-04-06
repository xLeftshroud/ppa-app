from __future__ import annotations

import math

import pandas as pd


def build_feature_df(
    prices: list[float],
    customer: str | None,
    promotion_indicator: int,
    week: int | None,
    attrs: dict,
    continuous_week: int = 0,
) -> pd.DataFrame:
    base: dict = {
        "promotion_indicator": promotion_indicator,
        "continuous_week": continuous_week,
    }

    if customer is not None:
        base["customer"] = customer

    if week is not None:
        base["week_sin"] = math.sin(2 * math.pi * week / 52)
        base["week_cos"] = math.cos(2 * math.pi * week / 52)

    # Include only non-None attribute values from frontend
    for key, val in attrs.items():
        base[key] = val

    rows = []
    for price in prices:
        row = {**base, "price_per_litre": price}
        rows.append(row)
    return pd.DataFrame(rows)
