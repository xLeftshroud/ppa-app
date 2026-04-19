"""Random Forest regressor on log target.

Uses one-hot encoding for low-cardinality cats and drops the 379-level
product_sku_code and 55-level flavor (handled implicitly by panel
lag features + brand + pack attributes). Local elasticity extracted
via permutation or numerical derivative.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor


LOW_CARD_CATS = ["customer", "pack_type_internal", "pack_tier"]


@dataclass
class RFModel:
    n_estimators: int = 500
    max_depth: int | None = None
    min_samples_leaf: int = 20
    max_features: str | float = "sqrt"
    random_state: int = 42
    n_jobs: int = -1
    feature_cols: list[str] | None = None

    def __post_init__(self):
        self.est_: RandomForestRegressor | None = None
        self._feature_order_: list[str] | None = None

    def _encode(self, X: pd.DataFrame) -> pd.DataFrame:
        cats = [c for c in LOW_CARD_CATS if c in X.columns]
        dummies = pd.get_dummies(X[cats], drop_first=True, dummy_na=False) if cats else pd.DataFrame(index=X.index)
        num = X.drop(columns=cats, errors="ignore").select_dtypes(include=[np.number])
        return pd.concat([num, dummies.astype(float)], axis=1)

    def fit(self, X: pd.DataFrame, y: np.ndarray) -> "RFModel":
        cols = self.feature_cols or list(X.columns)
        Xe = self._encode(X[cols]).fillna(0.0)
        self._feature_order_ = list(Xe.columns)
        self.est_ = RandomForestRegressor(
            n_estimators=self.n_estimators,
            max_depth=self.max_depth,
            min_samples_leaf=self.min_samples_leaf,
            max_features=self.max_features,
            random_state=self.random_state,
            n_jobs=self.n_jobs,
        )
        self.est_.fit(Xe.values, y)
        return self

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        cols = self.feature_cols or list(X.columns)
        Xe = self._encode(X[cols]).reindex(columns=self._feature_order_, fill_value=0.0)
        return self.est_.predict(Xe.fillna(0.0).values)

    @property
    def feature_importance_(self) -> pd.Series:
        return pd.Series(self.est_.feature_importances_, index=self._feature_order_).sort_values(ascending=False)
