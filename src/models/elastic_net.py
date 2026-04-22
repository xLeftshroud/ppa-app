"""Elastic Net on log-log demand model (Tier 1, interpretable baseline).

Pipeline: OHE (low-card cats) + TargetEncoder (high-card cats) + StandardScaler
(numerics) + sklearn.linear_model.ElasticNet. Own-price coefficient on
`log_price_per_litre` is the standardized elasticity; un-standardize via
the scaler's std to get the interpretable elasticity.

The old cvxpy hard constraint `β[log_price_per_litre] <= 0` is gone so
the saved joblib is a pure sklearn object. Callers must sign-test the
fitted elasticity and handle the (rare) positive-sign case externally.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd
from sklearn.linear_model import ElasticNet as SKElasticNet
from sklearn.pipeline import Pipeline

from .preprocess import build_encoder
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
        self.pipeline_: Pipeline | None = None
        self._feature_order_: list[str] | None = None

    def _split_cols(self, cols: list[str]) -> tuple[list[str], list[str]]:
        cats = [c for c in CATEGORICAL_COLS if c in cols]
        nums = [c for c in cols if c not in cats]
        return nums, cats

    def fit(self, X: pd.DataFrame, y: np.ndarray) -> "ElasticNetModel":
        cols = self.feature_cols or list(X.columns)
        X = X[cols]
        nums, cats = self._split_cols(cols)
        prep = build_encoder(
            X, cat_cols=cats, num_cols=nums,
            high_card_threshold=EN_HIGH_CARD_THRESHOLD,
            scale_numeric=True,
        )
        model = SKElasticNet(
            alpha=self.alpha,
            l1_ratio=self.l1_ratio,
            max_iter=self.max_iter,
            random_state=self.random_state,
        )
        self.pipeline_ = Pipeline([("prep", prep), ("model", model)])
        self.pipeline_.fit(X, y)
        self._feature_order_ = list(
            self.pipeline_.named_steps["prep"].get_feature_names_out()
        )
        return self

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        cols = self.feature_cols or list(X.columns)
        return self.pipeline_.predict(X[cols])

    @property
    def coefficients(self) -> pd.Series:
        est = self.pipeline_.named_steps["model"]
        return pd.Series(est.coef_, index=self._feature_order_).sort_values()

    def own_price_elasticity(self) -> float | None:
        """β on standardized log_price_per_litre, un-standardized to
        recover the interpretable "% volume change per % price change".

        Returns None if the price feature isn't in the pipeline (shouldn't
        happen for EN). Sign is NOT guaranteed negative: caller should
        sign-test the returned value.
        """
        feat = MONOTONIC_PRICE_FEAT
        if feat not in self._feature_order_:
            return None
        est = self.pipeline_.named_steps["model"]
        prep = self.pipeline_.named_steps["prep"]
        idx = self._feature_order_.index(feat)
        beta_std = float(est.coef_[idx])

        scaler = prep.named_transformers_.get("num")
        if scaler is None or isinstance(scaler, str):
            return beta_std
        scaler_cols = list(scaler.feature_names_in_)
        if feat not in scaler_cols:
            return beta_std
        std = float(scaler.scale_[scaler_cols.index(feat)])
        return beta_std / std if std > 0 else beta_std
