"""API tests for GET /v1/historical-price."""
from __future__ import annotations


def test_historical_price_happy_path(client) -> None:
    resp = client.get(
        "/v1/historical-price",
        params={
            "product_sku_code": 100001,
            "customer": "L2_TESCO",
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["yearweek"] == 202522
    assert body["volume_units"] == 20856
    assert abs(body["price_per_litre"] - 1.55) < 1e-6


def test_historical_price_not_found(client) -> None:
    resp = client.get(
        "/v1/historical-price",
        params={
            "product_sku_code": 999999,
            "customer": "L2_TESCO",
        },
    )
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "HISTORICAL_PRICE_NOT_FOUND"
