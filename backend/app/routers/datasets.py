from __future__ import annotations

import logging

from fastapi import APIRouter, UploadFile, File

from app.models.response_models import UploadResponse
from app.services.dataset_service import store_dataset
from app.utils.csv_validator import validate_csv
from app.config import settings
from app.utils.error_handler import CsvParseError

logger = logging.getLogger(__name__)

router = APIRouter(tags=["datasets"])

MAX_SIZE = settings.max_upload_size_mb * 1024 * 1024


@router.post("/datasets/upload", response_model=UploadResponse)
async def upload_dataset(file: UploadFile = File(...)):
    raw = await file.read()
    if len(raw) > MAX_SIZE:
        raise CsvParseError(f"File too large ({len(raw)} bytes). Max is 50MB.")

    df = validate_csv(raw)
    dataset_id = store_dataset(df)

    sku_count = df["product_sku_code"].nunique()
    customer_values = sorted(df["customer"].unique().tolist())

    logger.info("Dataset uploaded: id=%s rows=%d skus=%d", dataset_id, len(df), sku_count)

    return UploadResponse(
        dataset_id=dataset_id,
        row_count=len(df),
        sku_count=sku_count,
        customer_values=customer_values,
    )
