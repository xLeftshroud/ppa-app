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
from app.services import dataset_service, pipeline_service
from app.utils.csv_validator import validate_csv

FIXTURES_DIR = Path(__file__).parent / "fixtures"
SAMPLE_CSV = FIXTURES_DIR / "sample.csv"

# Metadata matching what the real metadata.json provides — used by
# simulation_service to filter features and check price distribution warnings.
_TEST_METADATA = {
    "model_name": "DummyDemandModel",
    "model_version": "test",
    "features_version": "v1",
    "features": [
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


@pytest.fixture(autouse=True)
def _reset_dataset_store():
    """Each test gets a fresh in-memory dataset store."""
    dataset_service._store.clear()
    yield
    dataset_service._store.clear()


@pytest.fixture
def sample_csv_bytes() -> bytes:
    return SAMPLE_CSV.read_bytes()


@pytest.fixture
def sample_df(sample_csv_bytes: bytes) -> pd.DataFrame:
    return validate_csv(sample_csv_bytes)


@pytest.fixture
def dataset_id(sample_df: pd.DataFrame) -> str:
    return dataset_service.store_dataset(sample_df)


@pytest.fixture
def client() -> TestClient:
    # Import here so _force_dummy_pipeline has already patched pipeline_service
    # before app.main's lifespan tries to run.
    from app.main import app

    # Bypass lifespan (which would call load_pipeline / load_training_csv)
    with TestClient(app) as c:
        # Re-apply dummy pipeline in case lifespan ran and overwrote it.
        pipeline_service._pipeline = Pipeline([("model", DummyDemandModel())])
        pipeline_service._metadata = dict(_TEST_METADATA)
        yield c


@pytest.fixture
def uploaded_client(client: TestClient, sample_csv_bytes: bytes) -> tuple[TestClient, str]:
    """Client with a dataset already uploaded via the real endpoint."""
    resp = client.post(
        "/v1/datasets/upload",
        files={"file": ("sample.csv", sample_csv_bytes, "text/csv")},
    )
    assert resp.status_code == 200, resp.text
    return client, resp.json()["dataset_id"]
