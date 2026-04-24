"""API tests for /v1/info."""
from __future__ import annotations

import pytest

from app.config import settings
from app.services import pipeline_service


def test_info_returns_settings_and_metadata_fields(client) -> None:
    resp = client.get("/v1/info")
    assert resp.status_code == 200
    body = resp.json()

    assert body["model_path"] == settings.model_path
    assert body["metadata_path"] == settings.metadata_path
    assert body["training_data_path"] == settings.training_data_path

    md = pipeline_service.get_metadata()
    assert body["model_type"] == md.get("model_type")
    assert body["feature_cols"] == md.get("feature_cols", [])


def test_info_using_dummy_pipeline_false_by_default(client, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(pipeline_service, "_using_dummy", False)
    resp = client.get("/v1/info")
    assert resp.json()["using_dummy_pipeline"] is False


def test_info_using_dummy_pipeline_true_on_fallback(client, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(pipeline_service, "_using_dummy", True)
    resp = client.get("/v1/info")
    assert resp.json()["using_dummy_pipeline"] is True
