from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.services.price_range_service import get_all_skus, get_price_range

router = APIRouter(tags=["price-range"])


@router.get("/skus")
def list_skus() -> list[int]:
    return get_all_skus()


@router.get("/skus/{sku}/price-range")
def sku_price_range(sku: int):
    result = get_price_range(sku)
    if result is None:
        raise HTTPException(status_code=404, detail=f"SKU {sku} not found in training data")
    return result
