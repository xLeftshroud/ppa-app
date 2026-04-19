"""Expanding-window time-series CV on `continuous_week`.

Design:
- Sealed final holdout = last `TEST_WEEK_RATIO` fraction of unique weeks.
- Dev set (remaining weeks) is split into `N_SPLITS + 1` roughly equal
  blocks via ``np.array_split``; fold i uses blocks[:i] as train and
  blocks[i] as val (i = 1..N_SPLITS).

All splits operate on integer indices into the caller's DataFrame.
`yearweek` is used only for human-readable reporting in `describe_folds`.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from .config import TIME_COL, DISPLAY_TIME_COL, N_SPLITS, TEST_WEEK_RATIO


def final_holdout_split(
    df: pd.DataFrame,
    time_col: str = TIME_COL,
    test_ratio: float = TEST_WEEK_RATIO,
) -> tuple[np.ndarray, np.ndarray]:
    """Return (dev_idx, test_idx). Test set = latest `test_ratio` weeks."""
    weeks = np.sort(df[time_col].dropna().astype(int).unique())
    if len(weeks) < 2:
        raise ValueError("Need at least 2 unique weeks to form a holdout.")
    n_test = max(1, int(round(len(weeks) * test_ratio)))
    n_test = min(n_test, len(weeks) - 1)
    cut_week = int(weeks[-n_test])
    yw = df[time_col].to_numpy()
    dev_idx = np.where(yw < cut_week)[0]
    test_idx = np.where(yw >= cut_week)[0]
    return dev_idx, test_idx


def expanding_window_cv(
    df: pd.DataFrame,
    time_col: str = TIME_COL,
    n_splits: int = N_SPLITS,
) -> list[tuple[np.ndarray, np.ndarray]]:
    """Expanding-window folds over `time_col`.

    Partitions unique weeks into ``n_splits + 1`` blocks. Fold i trains on
    blocks[0..i-1] and validates on block[i], for i = 1..n_splits.
    """
    weeks = np.sort(df[time_col].dropna().astype(int).unique())
    if len(weeks) < n_splits + 1:
        raise ValueError(
            f"Need at least {n_splits + 1} unique weeks for {n_splits} folds; got {len(weeks)}."
        )
    blocks = np.array_split(weeks, n_splits + 1)

    yw = df[time_col].to_numpy()
    folds: list[tuple[np.ndarray, np.ndarray]] = []
    for i in range(1, n_splits + 1):
        train_weeks = np.concatenate(blocks[:i])
        val_weeks = blocks[i]
        train_idx = np.where(np.isin(yw, train_weeks))[0]
        val_idx = np.where(np.isin(yw, val_weeks))[0]
        if len(train_idx) == 0 or len(val_idx) == 0:
            continue
        folds.append((train_idx, val_idx))
    return folds


def describe_folds(
    df: pd.DataFrame,
    time_col: str = TIME_COL,
    display_col: str = DISPLAY_TIME_COL,
    n_splits: int = N_SPLITS,
) -> pd.DataFrame:
    """Human-readable fold summary with both continuous_week and yearweek ranges."""
    rows = []
    has_display = display_col in df.columns
    for i, (tr, va) in enumerate(expanding_window_cv(df, time_col, n_splits), 1):
        row = {
            "fold": i,
            "train_rows": len(tr),
            "val_rows": len(va),
            "train_cw_min": int(df[time_col].iloc[tr].min()),
            "train_cw_max": int(df[time_col].iloc[tr].max()),
            "val_cw_min": int(df[time_col].iloc[va].min()),
            "val_cw_max": int(df[time_col].iloc[va].max()),
        }
        if has_display:
            row["train_yw_min"] = int(df[display_col].iloc[tr].min())
            row["train_yw_max"] = int(df[display_col].iloc[tr].max())
            row["val_yw_min"] = int(df[display_col].iloc[va].min())
            row["val_yw_max"] = int(df[display_col].iloc[va].max())
        rows.append(row)
    return pd.DataFrame(rows)
