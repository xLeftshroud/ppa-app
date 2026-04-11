"""Unit tests for baseline_service."""
from __future__ import annotations

import pandas as pd
import pytest

from app.services.baseline_service import get_baseline
from app.utils.error_handler import BaselineNotFound


def test_returns_row_with_max_yearweek(sample_df: pd.DataFrame) -> None:
    bl = get_baseline(sample_df, 100001, "L2_TESCO")
    # sample.csv has three TESCO rows for SKU 100001: 202520, 202521, 202522
    assert bl["yearweek"] == 202522
    assert bl["price_per_litre"] == pytest.approx(1.55)
    assert bl["volume_units"] == 7900


def test_raises_when_no_match(sample_df: pd.DataFrame) -> None:
    with pytest.raises(BaselineNotFound):
        get_baseline(sample_df, 999999, "L2_TESCO")


def test_raises_when_customer_missing(sample_df: pd.DataFrame) -> None:
    with pytest.raises(BaselineNotFound):
        get_baseline(sample_df, 100001, "L2_UNKNOWN")
