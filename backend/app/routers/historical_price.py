from __future__ import annotations

from fastapi import APIRouter, Query

from app.models.response_models import HistoricalPriceResponse
from app.services.dataset_service import get_dataset
from app.services.historical_price_service import get_historical_price

router = APIRouter(tags=["historical_price"])


@router.get("/historical-price", response_model=HistoricalPriceResponse)
def fetch_historical_price(
    product_sku_code: int = Query(...),
    customer: str = Query(...),
):
    df = get_dataset()
    hp = get_historical_price(df, product_sku_code, customer)
    return HistoricalPriceResponse(**hp)
