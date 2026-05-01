"""Unit tests for historical_price_service."""
from __future__ import annotations

import pandas as pd
import pytest

from app.services.historical_price_service import get_historical_price
from app.utils.error_handler import HistoricalPriceNotFound


def test_returns_row_with_max_yearweek(sample_df: pd.DataFrame) -> None:
    hp = get_historical_price(sample_df, 100001, "L2_TESCO")
    # sample.csv has three TESCO rows for SKU 100001: 202520, 202521, 202522
    assert hp["yearweek"] == 202522
    assert hp["price_per_litre"] == pytest.approx(1.55)
    assert hp["volume_units"] == 20856


def test_raises_when_no_match(sample_df: pd.DataFrame) -> None:
    with pytest.raises(HistoricalPriceNotFound):
        get_historical_price(sample_df, 999999, "L2_TESCO")


def test_raises_when_customer_missing(sample_df: pd.DataFrame) -> None:
    with pytest.raises(HistoricalPriceNotFound):
        get_historical_price(sample_df, 100001, "L2_UNKNOWN")
