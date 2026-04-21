"""Histogram gradient boosting regressor with native categorical support.

sklearn's RandomForestRegressor does not support monotone constraints or
native categorical splits; this module uses HistGradientBoostingRegressor
(sklearn >=1.4) which supports both. Class name `RFModel` is preserved so
the outer pipeline does not need to change, but the algorithm underneath
is GBDT, not bagging.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor

from .preprocess import cast_categoricals
from ..config import CATEGORICAL_COLS

MONOTONIC_PRICE_FEAT = "price_per_litre"


@dataclass
class RFModel:
    max_iter: int = 500
    max_depth: int | None = None
    min_samples_leaf: int = 20
    learning_rate: float = 0.1
    l2_regularization: float = 0.0
    random_state: int = 42
    feature_cols: list[str] | None = None

    def __post_init__(self):
        self.est_: HistGradientBoostingRegressor | None = None
        self._feature_order_: list[str] | None = None
        self._cat_cols_: list[str] | None = None

    def _prepare(self, X: pd.DataFrame) -> pd.DataFrame:
        cols = self.feature_cols or list(X.columns)
        cats = [c for c in CATEGORICAL_COLS if c in cols]
        self._cat_cols_ = cats
        return cast_categoricals(X[cols], cats)

    def _build_monotone(self, feature_order: list[str]) -> list[int]:
        return [-1 if f == MONOTONIC_PRICE_FEAT else 0 for f in feature_order]

    def fit(self, X: pd.DataFrame, y: np.ndarray) -> "RFModel":
        Xp = self._prepare(X)
        self._feature_order_ = list(Xp.columns)
        mono = self._build_monotone(self._feature_order_)
        self.est_ = HistGradientBoostingRegressor(
            max_iter=self.max_iter,
            max_depth=self.max_depth,
            min_samples_leaf=self.min_samples_leaf,
            learning_rate=self.learning_rate,
            l2_regularization=self.l2_regularization,
            monotonic_cst=mono,
            categorical_features="from_dtype",
            random_state=self.random_state,
        )
        self.est_.fit(Xp, y)
        return self

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        Xp = self._prepare(X).reindex(columns=self._feature_order_)
        return self.est_.predict(Xp)

    @property
    def feature_importance_(self) -> pd.Series:
        """HistGBR does not expose built-in feature importances; returns zeros
        so downstream fallback paths don't crash. Use permutation importance
        for actual ranking."""
        n = len(self._feature_order_ or [])
        return pd.Series(np.zeros(n), index=self._feature_order_ or [])
