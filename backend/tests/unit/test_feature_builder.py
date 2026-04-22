"""Unit tests for the feature builder."""
from __future__ import annotations

import math

import pandas as pd

from app.utils.feature_builder import (
    build_feature_df,
    log_price_per_litre,
    pack_size_total,
    pack_tier,
)


def test_batch_prices_produces_n_rows() -> None:
    prices = [1.0, 1.5, 2.0, 2.5]
    df = build_feature_df(prices, {
        "customer": "L2_TESCO", "promotion_indicator": 0,
        "week": 13, "continuous_week": 100,
    })
    assert len(df) == 4
    assert list(df["price_per_litre"]) == prices


def test_week_encoding_matches_sin_cos_formula() -> None:
    week = 13
    df = build_feature_df([1.5], {
        "customer": "L2_TESCO", "promotion_indicator": 0,
        "week": week, "continuous_week": 0,
    })
    expected_sin = math.sin(2 * math.pi * week / 52)
    expected_cos = math.cos(2 * math.pi * week / 52)
    assert abs(df["week_sin"].iloc[0] - expected_sin) < 1e-12
    assert abs(df["week_cos"].iloc[0] - expected_cos) < 1e-12
    assert "week" not in df.columns


def test_week_omitted_skips_sin_cos() -> None:
    df = build_feature_df([1.5], {
        "customer": "L2_TESCO", "promotion_indicator": 0, "continuous_week": 0,
    })
    assert "week_sin" not in df.columns
    assert "week_cos" not in df.columns


def test_attrs_are_passed_through() -> None:
    attrs = {
        "customer": "L2_TESCO", "top_brand": "FANTA", "pack_size_internal": 330,
        "promotion_indicator": 1, "week": 1, "continuous_week": 50,
    }
    df = build_feature_df([1.5], attrs)
    assert df["top_brand"].iloc[0] == "FANTA"
    assert df["pack_size_internal"].iloc[0] == 330
    assert df["promotion_indicator"].iloc[0] == 1
    assert df["continuous_week"].iloc[0] == 50
    assert df["customer"].iloc[0] == "L2_TESCO"


def test_pack_size_total_multiplies_columns() -> None:
    df = pd.DataFrame({"pack_size_internal": [330, 500], "units_per_package_internal": [6, 1]})
    assert list(pack_size_total(df)) == [1980, 500]


def test_pack_tier_classifies_correctly() -> None:
    df = pd.DataFrame({
        # single_serve (330×1), multi_pack_take_home (200×6=1200), large_format (2000×1), other (500×2=1000)
        "pack_size_internal":         [330, 200, 2000, 500],
        "units_per_package_internal": [1,   6,   1,    2],
    })
    assert list(pack_tier(df)) == ["single_serve", "multi_pack_take_home", "large_format", "other"]


def test_log_price_per_litre_floors_at_epsilon() -> None:
    df = pd.DataFrame({"price_per_litre": [0.0, 1.0, math.e]})
    result = log_price_per_litre(df)
    assert result.iloc[0] < -13
    assert result.iloc[1] == 0
    assert abs(result.iloc[2] - 1.0) < 1e-9


def test_build_feature_df_derives_pack_and_log_when_source_cols_present() -> None:
    attrs = {"pack_size_internal": 200, "units_per_package_internal": 6}  # 1200ml total → multi_pack
    df = build_feature_df([1.0, 2.0], attrs)
    assert list(df["pack_size_total"]) == [1200, 1200]
    assert list(df["pack_tier"]) == ["multi_pack_take_home", "multi_pack_take_home"]
    assert abs(df["log_price_per_litre"].iloc[0] - 0.0) < 1e-9


def test_build_feature_df_skips_pack_derivations_when_source_missing() -> None:
    df = build_feature_df([1.0], {"customer": "L2_TESCO"})
    assert "pack_size_total" not in df.columns
    assert "pack_tier" not in df.columns
    assert "log_price_per_litre" in df.columns
