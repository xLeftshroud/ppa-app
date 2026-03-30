from __future__ import annotations

from fastapi import APIRouter, Query

from app.models.request_models import VALID_CUSTOMERS, SkuLookupRequest
from app.models.response_models import SkuItem, SkuListResponse
from app.services.catalog_service import (
    get_distinct_brands,
    get_distinct_flavors,
    get_distinct_pack_types,
    get_sku_catalog,
    lookup_sku_by_attributes,
)
from app.services.dataset_service import get_dataset

router = APIRouter(tags=["catalog"])


@router.get("/catalog/skus", response_model=SkuListResponse)
def list_skus(dataset_id: str = Query(...)):
    df = get_dataset(dataset_id)
    items = get_sku_catalog(df)
    return SkuListResponse(items=[SkuItem(**item) for item in items])


@router.get("/catalog/customers")
def list_customers():
    return VALID_CUSTOMERS


@router.get("/catalog/brands")
def list_brands(dataset_id: str = Query(...)):
    df = get_dataset(dataset_id)
    return get_distinct_brands(df)


@router.get("/catalog/flavors")
def list_flavors(dataset_id: str = Query(...)):
    df = get_dataset(dataset_id)
    return get_distinct_flavors(df)


@router.get("/catalog/pack-types")
def list_pack_types(dataset_id: str = Query(...)):
    df = get_dataset(dataset_id)
    return get_distinct_pack_types(df)


@router.post("/catalog/sku-lookup", response_model=SkuListResponse)
def sku_lookup(body: SkuLookupRequest):
    df = get_dataset(body.dataset_id)
    matches = lookup_sku_by_attributes(
        df,
        top_brand=body.top_brand,
        flavor_internal=body.flavor_internal,
        pack_type_internal=body.pack_type_internal,
        pack_size_internal=body.pack_size_internal,
        units_per_package_internal=body.units_per_package_internal,
    )
    return SkuListResponse(items=[SkuItem(**m) for m in matches])
