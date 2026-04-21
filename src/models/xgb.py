"""XGBoost regressor with monotonic constraint on log_price_per_litre.

The monotone constraint forces d(y_hat)/d(log_price_per_litre) <= 0,
guaranteeing negative own-price elasticity -- critical for PPA credibility
since a predicted POSITIVE elasticity would be economically nonsensical.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd
import xgboost as xgb

from .preprocess import cast_categoricals
from ..config import CATEGORICAL_COLS

MONOTONIC_PRICE_FEAT = "price_per_litre"


@dataclass
class XGBModel:
    n_estimators: int = 1000
    max_depth: int = 6
    learning_rate: float = 0.05
    min_child_weight: float = 5.0
    gamma: float = 0.0
    subsample: float = 0.8
    colsample_bytree: float = 0.8
    reg_alpha: float = 0.0
    reg_lambda: float = 1.0
    random_state: int = 42
    n_jobs: int = -1
    early_stopping_rounds: int = 50
    feature_cols: list[str] | None = None

    def __post_init__(self):
        self.est_: xgb.XGBRegressor | None = None
        self._feature_order_: list[str] | None = None

    def _prepare(self, X: pd.DataFrame) -> pd.DataFrame:
        cols = self.feature_cols or list(X.columns)
        cats = [c for c in CATEGORICAL_COLS if c in cols]
        return cast_categoricals(X[cols], cats)

    def _build_monotone(self, feature_order: list[str]) -> tuple[int, ...]:
        return tuple(-1 if f == MONOTONIC_PRICE_FEAT else 0 for f in feature_order)

    def fit(
        self,
        X: pd.DataFrame,
        y: np.ndarray,
        X_val: pd.DataFrame | None = None,
        y_val: np.ndarray | None = None,
    ) -> "XGBModel":
        Xp = self._prepare(X)
        self._feature_order_ = list(Xp.columns)
        mono = self._build_monotone(self._feature_order_)
        kwargs = dict(
            n_estimators=self.n_estimators,
            max_depth=self.max_depth,
            learning_rate=self.learning_rate,
            min_child_weight=self.min_child_weight,
            gamma=self.gamma,
            subsample=self.subsample,
            colsample_bytree=self.colsample_bytree,
            reg_alpha=self.reg_alpha,
            reg_lambda=self.reg_lambda,
            random_state=self.random_state,
            n_jobs=self.n_jobs,
            tree_method="hist",
            enable_categorical=True,
            monotone_constraints=mono,
        )
        self.est_ = xgb.XGBRegressor(**kwargs)
        fit_kwargs = {}
        if X_val is not None and y_val is not None:
            Xvp = self._prepare(X_val).reindex(columns=self._feature_order_)
            fit_kwargs["eval_set"] = [(Xvp, y_val)]
            fit_kwargs["verbose"] = False
            # set early stopping via constructor kwarg in xgboost>=2.0
            self.est_.set_params(early_stopping_rounds=self.early_stopping_rounds)
        self.est_.fit(Xp, y, **fit_kwargs)
        return self

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        Xp = self._prepare(X).reindex(columns=self._feature_order_)
        return self.est_.predict(Xp)

    @property
    def feature_importance_(self) -> pd.Series:
        return pd.Series(
            self.est_.feature_importances_, index=self._feature_order_
        ).sort_values(ascending=False)
