"""Elastic Net on log-log demand model (Tier 1, interpretable baseline).

System pipeline: target-encoded high-cardinality cats + standardized
numerics + L1/L2 penalty. Own-price coefficient β on `log_price_per_litre`
IS the elasticity estimate -- interpretable as "% volume change per % price change".
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd
from sklearn.linear_model import ElasticNet

from .preprocess import LinearPreprocessor
from ..config import CATEGORICAL_COLS


@dataclass
class ElasticNetModel:
    alpha: float = 1e-3
    l1_ratio: float = 0.5
    max_iter: int = 10_000
    random_state: int = 42
    feature_cols: list[str] | None = None

    def __post_init__(self):
        self.pre_: LinearPreprocessor | None = None
        self.est_: ElasticNet | None = None
        self._feature_order_: list[str] | None = None

    def fit(self, X: pd.DataFrame, y: np.ndarray) -> "ElasticNetModel":
        cols = self.feature_cols or list(X.columns)
        X = X[cols]
        cats = [c for c in CATEGORICAL_COLS if c in X.columns]
        nums = [c for c in X.columns if c not in cats]
        self.pre_ = LinearPreprocessor(cat_cols=cats, num_cols=nums)
        Xt = self.pre_.fit_transform(X, y)
        self._feature_order_ = list(Xt.columns)
        self.est_ = ElasticNet(
            alpha=self.alpha,
            l1_ratio=self.l1_ratio,
            max_iter=self.max_iter,
            random_state=self.random_state,
        )
        self.est_.fit(Xt.values, y)
        return self

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        cols = self.feature_cols or list(X.columns)
        Xt = self.pre_.transform(X[cols])
        Xt = Xt.reindex(columns=self._feature_order_, fill_value=0.0)
        return self.est_.predict(Xt.values)

    @property
    def coefficients(self) -> pd.Series:
        return pd.Series(self.est_.coef_, index=self._feature_order_).sort_values()

    def own_price_elasticity(self) -> float | None:
        """β on standardized log_price_per_litre, converted back to elasticity."""
        feat = "log_price_per_litre"
        if feat not in self._feature_order_:
            return None
        beta_std = float(self.est_.coef_[self._feature_order_.index(feat)])
        std = float(self.pre_._num_std.get(feat, 1.0))
        # unstandardize: coefficient in original-scale log units == elasticity
        return beta_std / std if std > 0 else beta_std
