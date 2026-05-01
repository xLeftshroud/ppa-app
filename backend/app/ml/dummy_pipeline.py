from __future__ import annotations

import numpy as np
from sklearn.base import BaseEstimator, RegressorMixin


class DummyDemandModel(BaseEstimator, RegressorMixin):
    """Log-log constant-elasticity demand model for demo purposes.

    Returns predicted volume in litres (matches real pipeline output unit).
    V_packs(P) = base * (P / P_ref)^(-epsilon) * customer_mult * promo_mult * seasonal
    V_litres   = V_packs * pack_size_internal * units_per_package_internal / 1000
    """

    CUSTOMER_MULTIPLIERS = {
        "L2_TESCO": 1.0,
        "L2_ASDA": 0.85,
        "L2_SAINSBURY'S": 0.92,
        "L2_MORRISONS": 0.78,
        "L2_CRTG": 0.65,
    }

    def fit(self, X, y=None):  # noqa: ARG002
        return self

    def __sklearn_is_fitted__(self) -> bool:
        return True

    def predict(self, X):
        base_volume = 8000.0
        ref_price = 1.50
        epsilon = 1.8

        prices = X["price_per_litre"].values.astype(float)
        prices = np.clip(prices, 0.01, None)

        volumes = base_volume * (prices / ref_price) ** (-epsilon)

        customers = X["customer"].values if "customer" in X.columns else np.full(len(X), "L2_TESCO")
        cust_mult = np.array([self.CUSTOMER_MULTIPLIERS.get(str(c), 1.0) for c in customers])
        volumes *= cust_mult

        if "promotion_indicator" in X.columns:
            promo = X["promotion_indicator"].values.astype(int)
            volumes *= np.where(promo == 1, 1.3, 1.0)

        if "week_sin" in X.columns:
            week_sin = X["week_sin"].values.astype(float)
            volumes *= 1.0 + 0.05 * week_sin

        if "pack_size_internal" in X.columns and "units_per_package_internal" in X.columns:
            pack_volume_l = (
                X["pack_size_internal"].values.astype(float)
                * X["units_per_package_internal"].values.astype(float)
                / 1000.0
            )
            volumes *= pack_volume_l
        else:
            volumes *= 2.64

        volumes = np.maximum(0.0, volumes).astype(float)
        return volumes
