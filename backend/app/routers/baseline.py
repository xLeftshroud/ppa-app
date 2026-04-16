from __future__ import annotations

from fastapi import APIRouter, Query

from app.models.response_models import BaselineResponse
from app.services.baseline_service import get_baseline
from app.services.dataset_service import get_dataset

router = APIRouter(tags=["baseline"])


@router.get("/baseline", response_model=BaselineResponse)
def fetch_baseline(
    product_sku_code: int = Query(...),
    customer: str = Query(...),
):
    df = get_dataset()
    bl = get_baseline(df, product_sku_code, customer)
    return BaselineResponse(**bl)
