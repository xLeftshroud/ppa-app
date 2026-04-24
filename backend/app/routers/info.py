from __future__ import annotations

from fastapi import APIRouter

from app.config import settings
from app.models.response_models import InfoResponse
from app.services.pipeline_service import get_metadata, is_using_dummy

router = APIRouter(tags=["info"])


@router.get("/info", response_model=InfoResponse)
def get_info() -> InfoResponse:
    md = get_metadata() or {}
    return InfoResponse(
        model_path=settings.model_path,
        metadata_path=settings.metadata_path,
        training_data_path=settings.training_data_path,
        model_type=md.get("model_type"),
        feature_cols=md.get("feature_cols", []),
        using_dummy_pipeline=is_using_dummy(),
    )
