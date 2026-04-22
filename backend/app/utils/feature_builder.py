from __future__ import annotations

import math

import pandas as pd


def build_feature_df(prices: list[float], attrs: dict) -> pd.DataFrame:
    base: dict = {}
    for key, val in attrs.items():
        if key == "week":
            base["week_sin"] = math.sin(2 * math.pi * val / 52)
            base["week_cos"] = math.cos(2 * math.pi * val / 52)
        else:
            base[key] = val

    rows = [{**base, "price_per_litre": p} for p in prices]
    return pd.DataFrame(rows)
