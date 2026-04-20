"""API tests for /v1/catalog/*."""
from __future__ import annotations


def test_list_skus_returns_items(client) -> None:
    resp = client.get("/v1/catalog/skus")
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert len(items) == 3
    codes = {it["product_sku_code"] for it in items}
    assert codes == {100001, 100002, 100003}


def test_list_customers(client) -> None:
    resp = client.get("/v1/catalog/customers")
    assert resp.status_code == 200
    customers = resp.json()
    assert "L2_TESCO" in customers
    assert customers == sorted(customers)
