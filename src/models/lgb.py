"""LightGBM regressor with native categorical handling.

Unlike XGBoost, LightGBM's native categorical splits are particularly
effective on high-cardinality categoricals like 379-level product_sku_code
and 55-level flavor -- it uses the Fisher (1958) optimal split rather than
one-hot.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from .preprocess import cast_categoricals
from ..config import CATEGORICAL_COLS

MONOTONIC_PRICE_FEAT = "price_per_litre"


@dataclass
class LGBModel:
    num_leaves: int = 63
    max_depth: int = -1
    learning_rate: float = 0.05
    min_data_in_leaf: int = 20
    feature_fraction: float = 0.9
    bagging_fraction: float = 0.9
    bagging_freq: int = 5
    reg_alpha: float = 0.0
    reg_lambda: float = 0.0
    n_estimators: int = 1000
    random_state: int = 42
    n_jobs: int = -1
    early_stopping_rounds: int = 50
    feature_cols: list[str] | None = None

    def __post_init__(self):
        self.est_ = None
        self._feature_order_: list[str] | None = None
        self._cat_cols_: list[str] | None = None

    def _prepare(self, X: pd.DataFrame) -> pd.DataFrame:
        cols = self.feature_cols or list(X.columns)
        cats = [c for c in CATEGORICAL_COLS if c in cols]
        self._cat_cols_ = cats
        return cast_categoricals(X[cols], cats)

    def _build_monotone(self, feature_order: list[str]) -> list[int]:
        return [-1 if f == MONOTONIC_PRICE_FEAT else 0 for f in feature_order]

    def fit(
        self,
        X: pd.DataFrame,
        y: np.ndarray,
        X_val: pd.DataFrame | None = None,
        y_val: np.ndarray | None = None,
    ) -> "LGBModel":
        import lightgbm as lgb

        Xp = self._prepare(X)
        self._feature_order_ = list(Xp.columns)
        mono = self._build_monotone(self._feature_order_)
        self.est_ = lgb.LGBMRegressor(
            num_leaves=self.num_leaves,
            max_depth=self.max_depth,
            learning_rate=self.learning_rate,
            min_data_in_leaf=self.min_data_in_leaf,
            feature_fraction=self.feature_fraction,
            bagging_fraction=self.bagging_fraction,
            bagging_freq=self.bagging_freq,
            reg_alpha=self.reg_alpha,
            reg_lambda=self.reg_lambda,
            n_estimators=self.n_estimators,
            random_state=self.random_state,
            n_jobs=self.n_jobs,
            monotone_constraints=mono,
            monotone_constraints_method="intermediate",
            verbose=-1,
        )
        fit_kwargs = {"categorical_feature": self._cat_cols_}
        if X_val is not None and y_val is not None:
            Xvp = self._prepare(X_val).reindex(columns=self._feature_order_)
            fit_kwargs["eval_set"] = [(Xvp, y_val)]
            fit_kwargs["callbacks"] = [
                lgb.early_stopping(self.early_stopping_rounds, verbose=False)
            ]
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
