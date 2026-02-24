from __future__ import annotations

import io
from typing import Any

import pandas as pd

from app.models.request_models import VALID_CUSTOMERS
from app.utils.error_handler import CsvParseError, CsvSchemaInvalid

REQUIRED_COLUMNS = [
    "product_sku_code",
    "customer",
    "yearweek",
    "nielsen_total_volume",
    "promotion_indicator",
    "top_brand",
    "flavor_internal",
    "pack_type_internal",
    "pack_size_internal",
    "units_per_package_internal",
    "price_per_litre",
]

INT_COLUMNS = [
    "product_sku_code",
    "yearweek",
    "nielsen_total_volume",
    "promotion_indicator",
    "pack_size_internal",
    "units_per_package_internal",
]


def validate_csv(raw_bytes: bytes) -> pd.DataFrame:
    # Phase 1: parse
    try:
        text = raw_bytes.decode("utf-8")
        df = pd.read_csv(io.StringIO(text))
    except Exception as exc:
        raise CsvParseError(f"Cannot parse CSV: {exc}")

    if df.empty:
        raise CsvParseError("CSV file is empty")

    # Phase 2: check required columns
    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise CsvSchemaInvalid(
            f"Missing required columns: {missing}",
            [{"column": c, "reason": "column missing"} for c in missing],
        )

    # Phase 3: check for null values
    errors: list[dict[str, Any]] = []
    for col in REQUIRED_COLUMNS:
        null_mask = df[col].isna()
        if null_mask.any():
            null_rows = df.index[null_mask].tolist()
            for row in null_rows[:10]:
                errors.append({"row": int(row) + 2, "column": col, "reason": "must not be null"})

    if errors:
        raise CsvSchemaInvalid("CSV contains null values", errors)

    # Phase 4: type coercion and value validation
    errors = []

    for col in INT_COLUMNS:
        try:
            df[col] = pd.to_numeric(df[col], errors="raise").astype(int)
        except (ValueError, TypeError):
            bad_mask = pd.to_numeric(df[col], errors="coerce").isna() & df[col].notna()
            for row in df.index[bad_mask].tolist()[:10]:
                errors.append({"row": int(row) + 2, "column": col, "reason": f"must be integer"})

    try:
        df["price_per_litre"] = pd.to_numeric(df["price_per_litre"], errors="raise").astype(float)
    except (ValueError, TypeError):
        bad_mask = pd.to_numeric(df["price_per_litre"], errors="coerce").isna() & df["price_per_litre"].notna()
        for row in df.index[bad_mask].tolist()[:10]:
            errors.append({"row": int(row) + 2, "column": "price_per_litre", "reason": "must be a number"})

    if errors:
        raise CsvSchemaInvalid("CSV validation failed", errors)

    # Phase 5: value-level validation
    bad_cust = ~df["customer"].isin(VALID_CUSTOMERS)
    for row in df.index[bad_cust].tolist()[:10]:
        errors.append({
            "row": int(row) + 2,
            "column": "customer",
            "reason": f"must be one of {VALID_CUSTOMERS}",
        })

    bad_promo = ~df["promotion_indicator"].isin([0, 1])
    for row in df.index[bad_promo].tolist()[:10]:
        errors.append({"row": int(row) + 2, "column": "promotion_indicator", "reason": "must be 0 or 1"})

    bad_price = df["price_per_litre"] < 0.01
    for row in df.index[bad_price].tolist()[:10]:
        errors.append({"row": int(row) + 2, "column": "price_per_litre", "reason": "must be >= 0.01"})

    for col in ["top_brand", "flavor_internal", "pack_type_internal"]:
        bad_str = df[col].astype(str).str.strip().eq("")
        for row in df.index[bad_str].tolist()[:10]:
            errors.append({"row": int(row) + 2, "column": col, "reason": "must not be empty"})

    if errors:
        raise CsvSchemaInvalid("CSV validation failed", errors)

    return df
