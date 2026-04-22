"""Export champion as a self-contained sklearn object.

The saved joblib contains only sklearn + xgboost + lightgbm classes, so
downstream apps can `joblib.load(path).predict(engineered_df)` with no
custom imports.

The inner Pipeline is the same preprocessing + estimator that was used
during CV/tuning (on log-scale y). At export time we clone its structure,
wrap it in TransformedTargetRegressor(log1p, expm1), and re-fit on raw
nielsen_total_volume so `.predict()` returns actual volume.
"""
from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.compose import TransformedTargetRegressor


def export_champion(
    wrapper,
    X: pd.DataFrame,
    y_raw: np.ndarray,
    output_path: str | Path,
) -> TransformedTargetRegressor:
    """Wrap the wrapper's inner Pipeline in TransformedTargetRegressor,
    re-fit on raw volume, dump to joblib. Returns the fitted TTR."""
    if getattr(wrapper, "pipeline_", None) is None:
        raise ValueError(
            "wrapper.pipeline_ is None — call wrapper.fit() before export."
        )

    inner = clone(wrapper.pipeline_)
    ttr = TransformedTargetRegressor(
        regressor=inner,
        func=np.log1p,
        inverse_func=np.expm1,
    )
    ttr.fit(X, y_raw)
    joblib.dump(ttr, str(output_path))
    return ttr
