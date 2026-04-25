from __future__ import annotations

import pandas as pd

from app.utils.error_handler import HistoricalPriceNotFound


def get_historical_price(df: pd.DataFrame, product_sku_code: int, customer: str) -> dict:
    mask = (df["product_sku_code"] == product_sku_code) & (df["customer"] == customer)
    filtered = df[mask]

    if filtered.empty:
        raise HistoricalPriceNotFound(
            f"No historical price found for SKU={product_sku_code}, customer={customer}"
        )

    latest = filtered.loc[filtered["yearweek"].idxmax()]

    return {
        "yearweek": int(latest["yearweek"]),
        "price_per_litre": float(latest["price_per_litre"]),
        "volume_units": int(round(float(latest["volume_in_litres"]))),
    }
