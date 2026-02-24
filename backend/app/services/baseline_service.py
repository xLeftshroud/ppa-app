from __future__ import annotations

import pandas as pd

from app.utils.error_handler import BaselineNotFound


def get_baseline(df: pd.DataFrame, product_sku_code: int, customer: str) -> dict:
    mask = (df["product_sku_code"] == product_sku_code) & (df["customer"] == customer)
    filtered = df[mask]

    if filtered.empty:
        raise BaselineNotFound(
            f"No baseline found for SKU={product_sku_code}, customer={customer}"
        )

    latest = filtered.loc[filtered["yearweek"].idxmax()]

    return {
        "yearweek": int(latest["yearweek"]),
        "price_per_litre": float(latest["price_per_litre"]),
        "volume_units": int(latest["nielsen_total_volume"]),
    }
