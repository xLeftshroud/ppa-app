from __future__ import annotations

import pandas as pd

SKU_ATTR_COLS = [
    "product_sku_code",
    "material_medium_description",
    "top_brand",
    "flavor_internal",
    "pack_type_internal",
    "pack_size_internal",
    "units_per_package_internal",
]


def get_sku_catalog(df: pd.DataFrame) -> list[dict]:
    deduped = df[SKU_ATTR_COLS].drop_duplicates().sort_values("product_sku_code")
    return deduped.to_dict(orient="records")


def get_sku_attributes(df: pd.DataFrame, product_sku_code: int) -> dict | None:
    mask = df["product_sku_code"] == product_sku_code
    rows = df.loc[mask, SKU_ATTR_COLS].drop_duplicates()
    if rows.empty:
        return None
    return rows.iloc[0].to_dict()


def get_distinct_brands(df: pd.DataFrame) -> list[str]:
    return sorted(df["top_brand"].dropna().unique().tolist())


def get_distinct_flavors(df: pd.DataFrame) -> list[str]:
    return sorted(df["flavor_internal"].dropna().unique().tolist())


def get_distinct_pack_types(df: pd.DataFrame) -> list[str]:
    return sorted(df["pack_type_internal"].dropna().unique().tolist())


def lookup_sku_by_attributes(
    df: pd.DataFrame,
    top_brand: str,
    flavor_internal: str,
    pack_type_internal: str,
    pack_size_internal: int,
    units_per_package_internal: int,
) -> list[dict]:
    mask = (
        (df["top_brand"] == top_brand)
        & (df["flavor_internal"] == flavor_internal)
        & (df["pack_type_internal"] == pack_type_internal)
        & (df["pack_size_internal"] == pack_size_internal)
        & (df["units_per_package_internal"] == units_per_package_internal)
    )
    matches = df.loc[mask, SKU_ATTR_COLS].drop_duplicates()
    return matches.to_dict(orient="records")
