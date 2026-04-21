"""Elastic Net on log-log demand model (Tier 1, interpretable baseline).

System pipeline: target-encoded high-cardinality cats + standardized
numerics + L1/L2 penalty. Own-price coefficient β on `log_price_per_litre`
IS the elasticity estimate -- interpretable as "% volume change per % price change".

Solver: cvxpy QP with a hard sign constraint β[log_price_per_litre] <= 0,
matching sklearn.ElasticNet's objective form so hyperparameters transfer.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd
import cvxpy as cp

from .preprocess import LinearPreprocessor
from ..config import CATEGORICAL_COLS, EN_HIGH_CARD_THRESHOLD

MONOTONIC_PRICE_FEAT = "log_price_per_litre"


@dataclass
class ElasticNetModel:
    alpha: float = 1e-3
    l1_ratio: float = 0.5
    max_iter: int = 10_000
    random_state: int = 42
    feature_cols: list[str] | None = None

    def __post_init__(self):
        self.pre_: LinearPreprocessor | None = None
        self._feature_order_: list[str] | None = None
        self._beta_: np.ndarray | None = None
        self._intercept_: float = 0.0

    def fit(self, X: pd.DataFrame, y: np.ndarray) -> "ElasticNetModel":
        cols = self.feature_cols or list(X.columns)
        X = X[cols]
        cats = [c for c in CATEGORICAL_COLS if c in X.columns]
        nums = [c for c in X.columns if c not in cats]
        self.pre_ = LinearPreprocessor(
            cat_cols=cats,
            num_cols=nums,
            high_card_threshold=EN_HIGH_CARD_THRESHOLD,
        )
        Xt = self.pre_.fit_transform(X, y)
        self._feature_order_ = list(Xt.columns)

        X_np = Xt.values.astype(float)
        y_np = np.asarray(y, dtype=float)
        n, p = X_np.shape
        beta = cp.Variable(p)
        intercept = cp.Variable()

        # sklearn.ElasticNet objective:
        # (1/(2n))||y - Xβ - b||² + α·l1·||β||₁ + α·(1-l1)/2·||β||²
        loss = cp.sum_squares(y_np - X_np @ beta - intercept) / (2 * n)
        l1 = cp.norm1(beta)
        l2 = cp.sum_squares(beta)
        obj = loss + self.alpha * (self.l1_ratio * l1 + (1 - self.l1_ratio) / 2 * l2)

        constraints = []
        if MONOTONIC_PRICE_FEAT in self._feature_order_:
            idx = self._feature_order_.index(MONOTONIC_PRICE_FEAT)
            constraints.append(beta[idx] <= 0)

        prob = cp.Problem(cp.Minimize(obj), constraints)
        try:
            prob.solve(solver=cp.ECOS, max_iters=self.max_iter)
        except (cp.error.SolverError, Exception):
            prob.solve(solver=cp.SCS, max_iters=self.max_iter)

        if prob.status not in ("optimal", "optimal_inaccurate"):
            raise RuntimeError(f"cvxpy Elastic Net solver failed: status={prob.status}")

        self._beta_ = np.asarray(beta.value).ravel()
        self._intercept_ = float(intercept.value)
        return self

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        cols = self.feature_cols or list(X.columns)
        Xt = self.pre_.transform(X[cols])
        Xt = Xt.reindex(columns=self._feature_order_, fill_value=0.0)
        return Xt.values @ self._beta_ + self._intercept_

    @property
    def coefficients(self) -> pd.Series:
        return pd.Series(self._beta_, index=self._feature_order_).sort_values()

    def own_price_elasticity(self) -> float | None:
        """β on standardized log_price_per_litre, converted back to elasticity."""
        feat = MONOTONIC_PRICE_FEAT
        if feat not in self._feature_order_:
            return None
        beta_std = float(self._beta_[self._feature_order_.index(feat)])
        std = float(self.pre_._num_std.get(feat, 1.0))
        return beta_std / std if std > 0 else beta_std
