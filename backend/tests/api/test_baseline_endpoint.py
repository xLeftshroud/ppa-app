"""API tests for GET /v1/baseline."""
from __future__ import annotations


def test_baseline_happy_path(uploaded_client) -> None:
    client, dataset_id = uploaded_client
    resp = client.get(
        "/v1/baseline",
        params={
            "dataset_id": dataset_id,
            "product_sku_code": 100001,
            "customer": "L2_TESCO",
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["yearweek"] == 202522
    assert body["volume_units"] == 7900
    assert abs(body["price_per_litre"] - 1.55) < 1e-6


def test_baseline_not_found(uploaded_client) -> None:
    client, dataset_id = uploaded_client
    resp = client.get(
        "/v1/baseline",
        params={
            "dataset_id": dataset_id,
            "product_sku_code": 999999,
            "customer": "L2_TESCO",
        },
    )
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "BASELINE_NOT_FOUND"
