"""Shared pytest fixtures for the PPA backend test suite.

All tests use the DummyDemandModel (no real pipeline.joblib required).
The pipeline_service module globals are patched at session start so
importing `app.main` never tries to load the real joblib.
"""
from __future__ import annotations

from pathlib import Path

import pandas as pd
import pytest
from fastapi.testclient import TestClient
from sklearn.pipeline import Pipeline

from app.ml.dummy_pipeline import DummyDemandModel
from app.services import pipeline_service, price_range_service
from app.ml.features import build_features

FIXTURES_DIR = Path(__file__).parent / "fixtures"
SAMPLE_CSV = FIXTURES_DIR / "sample.csv"

# Metadata matching what the real metadata.json provides — used by
# simulation_service to filter features and check price distribution warnings.
_TEST_METADATA = {
    "model_name": "DummyDemandModel",
    "model_version": "test",
    "features_version": "v1",
    "feature_cols": [
        "price_per_litre",
        "customer",
        "promotion_indicator",
        "top_brand",
        "flavor_internal",
        "pack_size_internal",
        "units_per_package_internal",
        "pack_type_internal",
        "continuous_week",
        "week_sin",
        "week_cos",
    ],
    "price_per_litre": {"p1": 0.5, "p99": 5.0},
}


@pytest.fixture(autouse=True, scope="session")
def _force_dummy_pipeline():
    """Force DummyDemandModel and known metadata for the entire test session."""
    pipeline_service._pipeline = Pipeline([("model", DummyDemandModel())])
    pipeline_service._metadata = dict(_TEST_METADATA)
    yield


@pytest.fixture
def sample_csv_bytes() -> bytes:
    return SAMPLE_CSV.read_bytes()


@pytest.fixture
def sample_df() -> pd.DataFrame:
    return build_features(pd.read_csv(SAMPLE_CSV))


@pytest.fixture
def client(sample_df: pd.DataFrame) -> TestClient:
    # Import here so _force_dummy_pipeline has already patched pipeline_service
    # before app.main's lifespan tries to run.
    from app.main import app

    with TestClient(app) as c:
        # The TestClient context manager runs the real lifespan, which calls
        # load_pipeline() and load_training_csv(). Override both with test values
        # *after* lifespan so the real training CSV doesn't leak into tests.
        pipeline_service._pipeline = Pipeline([("model", DummyDemandModel())])
        pipeline_service._metadata = dict(_TEST_METADATA)
        price_range_service._training_df = sample_df
        price_range_service._cache = _build_price_range_cache(sample_df)
        price_range_service._loaded = True
        yield c

    # Clean up the singleton so tests don't leak state.
    price_range_service._training_df = None
    price_range_service._cache = {}
    price_range_service._loaded = False


def _build_price_range_cache(df: pd.DataFrame) -> dict:
    import numpy as np

    cache: dict = {}
    sub = df[["product_sku_code", "price_per_litre"]].dropna()
    sub = sub[sub["price_per_litre"] > 0]
    for sku, group in sub.groupby("product_sku_code"):
        prices = group["price_per_litre"].values
        cache[int(sku)] = {
            "sku": int(sku),
            "metric": "price_per_litre",
            "n": len(prices),
            "p1": round(float(np.percentile(prices, 1)), 6),
            "p5": round(float(np.percentile(prices, 5)), 6),
            "p50": round(float(np.percentile(prices, 50)), 6),
            "p95": round(float(np.percentile(prices, 95)), 6),
            "p99": round(float(np.percentile(prices, 99)), 6),
        }
    return cache
