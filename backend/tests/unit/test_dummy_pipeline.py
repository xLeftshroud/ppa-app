"""Unit tests for DummyDemandModel (the fallback pipeline)."""
from __future__ import annotations

import pandas as pd

from app.ml.dummy_pipeline import DummyDemandModel


def _df(prices, customer="L2_TESCO", promo=0, pack=330):
    return pd.DataFrame(
        {
            "price_per_litre": prices,
            "customer": [customer] * len(prices),
            "promotion_indicator": [promo] * len(prices),
            "pack_size_internal": [pack] * len(prices),
        }
    )


def test_predict_returns_non_negative_same_length() -> None:
    model = DummyDemandModel()
    out = model.predict(_df([1.0, 1.5, 2.0]))
    assert len(out) == 3
    assert (out >= 0).all()


def test_price_increase_decreases_volume() -> None:
    model = DummyDemandModel()
    out = model.predict(_df([1.0, 2.0, 4.0]))
    # Monotonically decreasing — log-log demand
    assert out[0] > out[1] > out[2]


def test_customer_multiplier_applied() -> None:
    model = DummyDemandModel()
    tesco = model.predict(_df([1.5], customer="L2_TESCO"))[0]
    morrisons = model.predict(_df([1.5], customer="L2_MORRISONS"))[0]
    # TESCO multiplier 1.0 vs MORRISONS 0.78
    assert tesco > morrisons


def test_promotion_boost() -> None:
    model = DummyDemandModel()
    off = model.predict(_df([1.5], promo=0))[0]
    on = model.predict(_df([1.5], promo=1))[0]
    assert on > off
