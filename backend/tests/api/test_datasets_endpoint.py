"""API tests for POST /v1/datasets/upload."""
from __future__ import annotations


def test_upload_happy_path(client, sample_csv_bytes: bytes) -> None:
    resp = client.post(
        "/v1/datasets/upload",
        files={"file": ("sample.csv", sample_csv_bytes, "text/csv")},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "dataset_id" in body
    assert body["row_count"] == 10
    assert body["sku_count"] == 3  # 100001, 100002, 100003
    assert "L2_TESCO" in body["customer_values"]


def test_upload_invalid_csv_returns_unified_error(client) -> None:
    bad = b"product_sku_code,customer\n100001,L2_TESCO\n"  # missing required columns
    resp = client.post(
        "/v1/datasets/upload",
        files={"file": ("bad.csv", bad, "text/csv")},
    )
    assert resp.status_code == 422
    body = resp.json()
    assert body["error"]["code"] == "CSV_SCHEMA_INVALID"
    assert "request_id" in body["error"]
    assert isinstance(body["error"]["details"], list)


def test_upload_unparseable_bytes_returns_parse_error(client) -> None:
    resp = client.post(
        "/v1/datasets/upload",
        files={"file": ("bad.csv", b"\xff\xfe\x00garbage", "text/csv")},
    )
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "CSV_PARSE_ERROR"
