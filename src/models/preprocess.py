"""Shared preprocessing: train target encoder for linear models,
cast categoricals for tree models. One place, reused by all 5 model adapters.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable

import numpy as np
import pandas as pd


@dataclass
class LinearPreprocessor:
    """Categorical encoder + numeric standardizer for linear models.

    Categoricals are split by cardinality:
    - nunique <= high_card_threshold -> one-hot (drop_first=True)
    - nunique >  high_card_threshold -> smoothed target encoding

    TE is deliberately avoided for low-card cats in linear models because the
    encoded column's variance scales with y and crowds out the price coefficient
    under L1/L2 penalty; one-hot keeps the cat effect on a bounded 0/1 scale.
    """
    cat_cols: list[str] = field(default_factory=list)
    num_cols: list[str] = field(default_factory=list)
    high_card_threshold: int = 20
    smoothing: float = 20.0

    _te_maps: dict[str, dict] = field(default_factory=dict)
    _te_global: float = 0.0
    _num_mean: pd.Series = None
    _num_std: pd.Series = None
    _low_card_: list[str] = field(default_factory=list)
    _high_card_: list[str] = field(default_factory=list)
    _dummy_cols_: list[str] = field(default_factory=list)

    def fit(self, X: pd.DataFrame, y: np.ndarray) -> "LinearPreprocessor":
        self._te_global = float(np.mean(y))

        low, high = [], []
        for c in self.cat_cols:
            if c not in X.columns:
                continue
            if X[c].nunique(dropna=False) <= self.high_card_threshold:
                low.append(c)
            else:
                high.append(c)
        self._low_card_ = low
        self._high_card_ = high

        # smoothed target encoding for high-card cats only
        for c in self._high_card_:
            grp = pd.DataFrame({c: X[c].values, "_y": y}).groupby(c)["_y"]
            counts = grp.count()
            means = grp.mean()
            smooth = (counts * means + self.smoothing * self._te_global) / (
                counts + self.smoothing
            )
            self._te_maps[c] = smooth.to_dict()

        # one-hot dummy schema from low-card cats
        if self._low_card_:
            dummies = pd.get_dummies(
                X[self._low_card_], drop_first=True, dummy_na=False
            ).astype(float)
            self._dummy_cols_ = list(dummies.columns)
        else:
            self._dummy_cols_ = []

        num = [c for c in self.num_cols if c in X.columns]
        self._num_mean = X[num].mean()
        self._num_std = X[num].std().replace(0, 1.0)
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        out = pd.DataFrame(index=X.index)

        num = [c for c in self.num_cols if c in X.columns]
        if num:
            out[num] = (X[num] - self._num_mean[num]) / self._num_std[num]

        for c in self._high_card_:
            if c not in X.columns:
                continue
            mapped = X[c].map(self._te_maps.get(c, {}))
            out[f"te_{c}"] = mapped.fillna(self._te_global).astype(float)

        if self._low_card_:
            present = [c for c in self._low_card_ if c in X.columns]
            if present:
                dummies = pd.get_dummies(
                    X[present], drop_first=True, dummy_na=False
                ).astype(float)
            else:
                dummies = pd.DataFrame(index=X.index)
            dummies = dummies.reindex(columns=self._dummy_cols_, fill_value=0.0)
            out = pd.concat([out, dummies], axis=1)

        return out.fillna(0.0)

    def fit_transform(self, X: pd.DataFrame, y: np.ndarray) -> pd.DataFrame:
        self.fit(X, y)
        return self.transform(X)


def cast_categoricals(df: pd.DataFrame, cat_cols: Iterable[str]) -> pd.DataFrame:
    """Cast to pandas category dtype so lightgbm/xgboost recognize natively."""
    out = df.copy()
    for c in cat_cols:
        if c in out.columns:
            out[c] = out[c].astype("category")
    return out
