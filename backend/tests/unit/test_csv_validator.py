"""Unit tests for the CSV validator."""
from __future__ import annotations

import pytest

from app.utils.csv_validator import REQUIRED_COLUMNS, validate_csv
from app.utils.error_handler import CsvParseError, CsvSchemaInvalid


def _row(**overrides) -> str:
    row = {
        "product_sku_code": 100001,
        "customer": "L2_TESCO",
        "yearweek": 202520,
        "nielsen_total_volume": 8000,
        "promotion_indicator": 0,
        "top_brand": "FANTA",
        "flavor_internal": "ORANGE",
        "pack_type_internal": "CAN",
        "pack_size_internal": 330,
        "units_per_package_internal": 8,
        "price_per_litre": 1.50,
    }
    row.update(overrides)
    return ",".join(str(row[c]) for c in REQUIRED_COLUMNS)


def _csv(rows: list[str]) -> bytes:
    header = ",".join(REQUIRED_COLUMNS)
    return ("\n".join([header, *rows]) + "\n").encode("utf-8")


def test_valid_csv_parses(sample_csv_bytes: bytes) -> None:
    df = validate_csv(sample_csv_bytes)
    assert len(df) == 10
    for col in REQUIRED_COLUMNS:
        assert col in df.columns
    assert df["product_sku_code"].dtype.kind == "i"
    assert df["price_per_litre"].dtype.kind == "f"


def test_missing_required_column_raises_schema_invalid() -> None:
    header = ",".join(c for c in REQUIRED_COLUMNS if c != "top_brand")
    data = (header + "\n100001,L2_TESCO,202520,8000,0,ORANGE,CAN,330,8,1.50\n").encode("utf-8")
    with pytest.raises(CsvSchemaInvalid) as exc:
        validate_csv(data)
    assert exc.value.code == "CSV_SCHEMA_INVALID"
    assert any(d.get("column") == "top_brand" for d in exc.value.details)


def test_null_in_required_column_raises_schema_invalid() -> None:
    data = _csv([_row(top_brand="")])  # empty string — but nulls in pandas mean NaN
    # Force a real null for the top_brand column
    rows = [
        "100001,L2_TESCO,202520,8000,0,,ORANGE,CAN,330,8,1.50",
    ]
    data = _csv(rows)
    with pytest.raises(CsvSchemaInvalid):
        validate_csv(data)


def test_promotion_indicator_out_of_range() -> None:
    data = _csv([_row(promotion_indicator=2)])
    with pytest.raises(CsvSchemaInvalid) as exc:
        validate_csv(data)
    assert any(d["column"] == "promotion_indicator" for d in exc.value.details)


def test_price_below_minimum() -> None:
    data = _csv([_row(price_per_litre=0.0)])
    with pytest.raises(CsvSchemaInvalid) as exc:
        validate_csv(data)
    assert any(d["column"] == "price_per_litre" for d in exc.value.details)


def test_non_utf8_bytes_raises_parse_error() -> None:
    with pytest.raises(CsvParseError):
        validate_csv(b"\xff\xfe\x00\x00not a csv")


def test_empty_csv_raises_parse_error() -> None:
    with pytest.raises(CsvParseError):
        validate_csv(b"")
