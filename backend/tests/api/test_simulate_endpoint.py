"""API tests for POST /v1/simulate."""
from __future__ import annotations


def _body(dataset_id: str, **overrides) -> dict:
    body = {
        "dataset_id": dataset_id,
        "product_sku_code": 100001,
        "customer": "L2_TESCO",
        "promotion_indicator": 0,
        "week": 20,
        "top_brand": "FANTA",
        "flavor_internal": "ORANGE",
        "pack_type_internal": "CAN",
        "pack_size_internal": 330,
        "units_per_package_internal": 8,
        "baseline_override_price_per_litre": 1.50,
        "selected_new_price_per_litre": 1.80,
    }
    body.update(overrides)
    return body


def test_simulate_happy_path(uploaded_client) -> None:
    client, dataset_id = uploaded_client
    resp = client.post("/v1/simulate", json=_body(dataset_id))
    assert resp.status_code == 200, resp.text
    body = resp.json()

    assert body["model_info"]["model_name"] == "DummyDemandModel"
    assert len(body["curve"]) > 9000
    assert body["baseline"] is not None
    assert body["selected"] is not None
    assert body["selected"]["elasticity"] < 0
    assert body["arc_elasticity"] is not None
    assert isinstance(body["warnings"], list)


def test_simulate_unknown_dataset_id(client) -> None:
    resp = client.post("/v1/simulate", json=_body("does-not-exist"))
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "VALIDATION_ERROR"


def test_simulate_no_price_input_returns_curve_only(uploaded_client) -> None:
    client, dataset_id = uploaded_client
    body = _body(dataset_id)
    body.pop("selected_new_price_per_litre")
    resp = client.post("/v1/simulate", json=body)
    assert resp.status_code == 200
    data = resp.json()
    assert data["selected"] is None
    assert data["arc_elasticity"] is None
    assert len(data["curve"]) > 9000
