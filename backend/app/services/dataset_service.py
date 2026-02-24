from __future__ import annotations

import uuid

import pandas as pd

from app.utils.error_handler import ValidationError

_store: dict[str, pd.DataFrame] = {}


def store_dataset(df: pd.DataFrame) -> str:
    dataset_id = str(uuid.uuid4())
    _store[dataset_id] = df
    return dataset_id


def get_dataset(dataset_id: str) -> pd.DataFrame:
    if dataset_id not in _store:
        raise ValidationError(f"Dataset '{dataset_id}' not found. Please upload a CSV first.")
    return _store[dataset_id]
