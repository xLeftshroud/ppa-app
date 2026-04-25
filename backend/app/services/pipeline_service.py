from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

import joblib
from sklearn.pipeline import Pipeline

from app.config import settings
from app.ml.dummy_pipeline import DummyDemandModel

logger = logging.getLogger(__name__)

_pipeline: Pipeline | None = None
_metadata: dict[str, Any] = {}
_using_dummy: bool = False

_MODEL_PATH = Path(settings.model_path)
_METADATA_PATH = Path(settings.metadata_path)
_DUMMY_METADATA_PATH = Path(__file__).resolve().parent.parent / "ml" / "dummy_metadata.json"


def _build_dummy_pipeline() -> Pipeline:
    return Pipeline([("model", DummyDemandModel())])


def load_pipeline() -> None:
    global _pipeline, _metadata, _using_dummy

    try:
        _pipeline = joblib.load(_MODEL_PATH)
        with open(_METADATA_PATH) as f:
            _metadata = json.load(f)
        _using_dummy = False
        logger.info("Loaded real pipeline from %s", _MODEL_PATH)
    except Exception as exc:
        logger.warning("pipeline.joblib not found or failed to load (%s), using DummyPipeline", exc)
        _pipeline = _build_dummy_pipeline()
        with open(_DUMMY_METADATA_PATH) as f:
            _metadata = json.load(f)
        _using_dummy = True

    logger.info("Loaded metadata: model type=%s objective=%s", _metadata.get("model_type"), _metadata.get("objective"))


def get_pipeline() -> Pipeline:
    assert _pipeline is not None, "Pipeline not loaded. Call load_pipeline() first."
    return _pipeline


def get_metadata() -> dict[str, Any]:
    return _metadata


def is_using_dummy() -> bool:
    return _using_dummy
