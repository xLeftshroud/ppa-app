from __future__ import annotations

import logging

from fastapi import APIRouter

from app.models.request_models import SimulateRequest
from app.models.response_models import SimulateResponse
from app.services.simulation_service import run_simulation

logger = logging.getLogger(__name__)

router = APIRouter(tags=["simulate"])


@router.post("/simulate", response_model=SimulateResponse)
def simulate(body: SimulateRequest):
    logger.info(
        "Simulate: sku=%s customer=%s week=%d promo=%d",
        body.product_sku_code, body.customer, body.week, body.promotion_indicator,
    )
    return run_simulation(body)
