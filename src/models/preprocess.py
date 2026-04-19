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
    """Target-encode high-cardinality categoricals + standardize numerics."""
    cat_cols: list[str] = field(default_factory=list)
    num_cols: list[str] = field(default_factory=list)
    _te_maps: dict[str, dict] = field(default_factory=dict)
    _te_global: float = 0.0
    _num_mean: pd.Series = None
    _num_std: pd.Series = None
    smoothing: float = 20.0

    def fit(self, X: pd.DataFrame, y: np.ndarray) -> "LinearPreprocessor":
        self._te_global = float(np.mean(y))
        # smoothed target encoding
        for c in self.cat_cols:
            if c not in X.columns:
                continue
            grp = pd.DataFrame({c: X[c].values, "_y": y}).groupby(c)["_y"]
            counts = grp.count()
            means = grp.mean()
            smooth = (counts * means + self.smoothing * self._te_global) / (
                counts + self.smoothing
            )
            self._te_maps[c] = smooth.to_dict()

        num = [c for c in self.num_cols if c in X.columns]
        self._num_mean = X[num].mean()
        self._num_std = X[num].std().replace(0, 1.0)
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        out = pd.DataFrame(index=X.index)
        for c in self.cat_cols:
            if c not in X.columns:
                continue
            mapped = X[c].map(self._te_maps.get(c, {}))
            out[f"te_{c}"] = mapped.fillna(self._te_global).astype(float)
        num = [c for c in self.num_cols if c in X.columns]
        if num:
            out[num] = (X[num] - self._num_mean[num]) / self._num_std[num]
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
