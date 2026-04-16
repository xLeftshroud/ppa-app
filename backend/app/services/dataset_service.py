from __future__ import annotations

import pandas as pd

from app.services.price_range_service import get_training_df
from app.utils.error_handler import ValidationError


def get_dataset() -> pd.DataFrame:
    df = get_training_df()
    if df is None:
        raise ValidationError(
            "Backend dataset is not loaded. Check TRAINING_DATA_PATH and ensure the CSV exists."
        )
    return df
