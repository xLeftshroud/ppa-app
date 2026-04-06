from __future__ import annotations

import logging

from fastapi import APIRouter

from app.models.request_models import PredictPointsRequest
from app.models.response_models import PredictPointsResponse
from app.services.simulation_service import predict_points

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/predict-points", response_model=PredictPointsResponse)
def predict_points_endpoint(body: PredictPointsRequest):
    logger.info(
        "PredictPoints: sku=%s customer=%s baseline=%.4f selected=%s",
        body.product_sku_code,
        body.customer,
        body.baseline_price or 0,
        f"{body.selected_price:.4f}" if body.selected_price else "None",
    )
    return predict_points(body)
