"""API tests for /v1/catalog/*."""
from __future__ import annotations


def test_list_skus_returns_items(uploaded_client) -> None:
    client, dataset_id = uploaded_client
    resp = client.get("/v1/catalog/skus", params={"dataset_id": dataset_id})
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert len(items) == 3
    codes = {it["product_sku_code"] for it in items}
    assert codes == {100001, 100002, 100003}


def test_list_customers(uploaded_client) -> None:
    client, dataset_id = uploaded_client
    resp = client.get("/v1/catalog/customers", params={"dataset_id": dataset_id})
    assert resp.status_code == 200
    customers = resp.json()
    assert "L2_TESCO" in customers
    assert customers == sorted(customers)


def test_unknown_dataset_id_returns_unified_error(client) -> None:
    resp = client.get("/v1/catalog/skus", params={"dataset_id": "does-not-exist"})
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "VALIDATION_ERROR"
