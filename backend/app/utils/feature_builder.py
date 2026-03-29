from __future__ import annotations

import math

import pandas as pd


def build_feature_df(
    prices: list[float],
    customer: str,
    promotion_indicator: int,
    week: int,
    sku_attrs: dict,
    product_sku_code: int,
    continuous_week: int = 0,
) -> pd.DataFrame:
    week_sin = math.sin(2 * math.pi * week / 52)
    week_cos = math.cos(2 * math.pi * week / 52)

    rows = []
    for price in prices:
        rows.append({
            "product_sku_code": product_sku_code,
            "customer": customer,
            "material_medium_description": sku_attrs["material_medium_description"],
            "top_brand": sku_attrs["top_brand"],
            "flavor_internal": sku_attrs["flavor_internal"],
            "pack_type_internal": sku_attrs["pack_type_internal"],
            "promotion_indicator": promotion_indicator,
            "pack_size_internal": sku_attrs["pack_size_internal"],
            "units_per_package_internal": sku_attrs["units_per_package_internal"],
            "price_per_litre": price,
            "week_sin": week_sin,
            "week_cos": week_cos,
            "continuous_week": continuous_week,
        })
    return pd.DataFrame(rows)
