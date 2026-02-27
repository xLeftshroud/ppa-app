from __future__ import annotations

import logging
from pathlib import Path

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# Pre-computed cache: sku_code -> quantile dict
_cache: dict[int, dict] = {}
_loaded = False


def load_training_csv() -> None:
    """Load the training CSV from backend/data/ and pre-compute per-SKU price quantiles."""
    global _cache, _loaded

    data_dir = Path(__file__).resolve().parent.parent.parent / "data"
    csv_files = sorted(data_dir.glob("*.csv"))
    if not csv_files:
        logger.warning("No CSV files found in %s — price range endpoint will return 404 for all SKUs", data_dir)
        _loaded = True
        return

    csv_path = csv_files[0]
    logger.info("Loading training CSV for price ranges: %s", csv_path)

    df = pd.read_csv(csv_path)

    for col in ("product_sku_code", "price_per_litre"):
        if col not in df.columns:
            raise ValueError(f"Training CSV missing required column: {col}")

    df = df[["product_sku_code", "price_per_litre"]].copy()
    df = df.dropna(subset=["price_per_litre"])
    df = df[df["price_per_litre"] > 0]

    for sku, group in df.groupby("product_sku_code"):
        prices = group["price_per_litre"].values
        _cache[int(sku)] = {
            "sku": int(sku),
            "metric": "price_per_litre",
            "n": len(prices),
            "p1": round(float(np.percentile(prices, 1)), 6),
            "p5": round(float(np.percentile(prices, 5)), 6),
            "p50": round(float(np.percentile(prices, 50)), 6),
            "p95": round(float(np.percentile(prices, 95)), 6),
            "p99": round(float(np.percentile(prices, 99)), 6),
        }

    logger.info("Pre-computed price ranges for %d SKUs", len(_cache))
    _loaded = True


def get_all_skus() -> list[int]:
    return sorted(_cache.keys())


def get_price_range(sku: int) -> dict | None:
    return _cache.get(sku)
