from __future__ import annotations

import math

import numpy as np
import pandas as pd


def week_sin(df: pd.DataFrame) -> pd.Series:
    """Sin encoding of the integer week-of-year."""
    return np.sin(2 * math.pi * df["week"] / 52)


def week_cos(df: pd.DataFrame) -> pd.Series:
    """Cos encoding of the integer week-of-year."""
    return np.cos(2 * math.pi * df["week"] / 52)


def pack_size_total(df: pd.DataFrame) -> pd.Series:
    """Total millilitres per package = single-unit size x units per pack."""
    return df["pack_size_internal"] * df["units_per_package_internal"]


def pack_tier(df: pd.DataFrame) -> pd.Series:
    """Coarse pack format: single_serve / multi_pack_take_home / large_format / other."""
    ps = df["pack_size_internal"]
    upk = df["units_per_package_internal"]
    tvol = pack_size_total(df)
    single = (ps < 500) & (upk == 1)
    multi_home = upk >= 6
    large_fmt = tvol >= 1500
    tier = pd.Series("other", index=df.index, dtype="object")
    tier[large_fmt] = "large_format"
    tier[multi_home & ~large_fmt] = "multi_pack_take_home"
    tier[single] = "single_serve"
    return tier


def log_price_per_litre(df: pd.DataFrame) -> pd.Series:
    """Natural log of price_per_litre with a floor to avoid log(0)."""
    return np.log(df["price_per_litre"].clip(lower=1e-6))


def build_feature_df(prices: list[float], attrs: dict) -> pd.DataFrame:
    rows = [{**attrs, "price_per_litre": p} for p in prices]
    df = pd.DataFrame(rows)

    if "week" in df.columns:
        df["week_sin"] = week_sin(df)
        df["week_cos"] = week_cos(df)
        df = df.drop(columns=["week"])

    if "pack_size_internal" in df.columns and "units_per_package_internal" in df.columns:
        df["pack_size_total"] = pack_size_total(df)
        df["pack_tier"] = pack_tier(df)

    df["log_price_per_litre"] = log_price_per_litre(df)

    return df
