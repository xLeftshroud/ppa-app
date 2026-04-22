"""Unit tests for the feature builder."""
from __future__ import annotations

import math

from app.utils.feature_builder import build_feature_df


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
    assert df["week_sin"].iloc[0] == expected_sin
    assert df["week_cos"].iloc[0] == expected_cos
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
