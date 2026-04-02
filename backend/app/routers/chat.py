from __future__ import annotations

import logging

from fastapi import APIRouter

from app.models.chat_models import ChatRequest, ChatResponse
from app.services.chat_service import process_chat

logger = logging.getLogger(__name__)

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest):
    logger.info("Chat request: %s", body.message[:120])
    return await process_chat(body)
