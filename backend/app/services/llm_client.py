from __future__ import annotations

import logging

from openai import AsyncOpenAI

from app.config import settings

logger = logging.getLogger(__name__)

_client: AsyncOpenAI | None = None


def get_llm_client() -> AsyncOpenAI:
    global _client
    if _client is not None:
        return _client

    if settings.llm_provider == "azure":
        base_url = (
            f"{settings.azure_openai_endpoint.rstrip('/')}"
            f"/openai/deployments/{settings.azure_openai_deployment}"
        )
        _client = AsyncOpenAI(
            api_key=settings.azure_openai_api_key,
            base_url=base_url,
            default_headers={"api-key": settings.azure_openai_api_key},
            default_query={"api-version": "2024-02-01"},
        )
        logger.info("LLM client initialized (Azure OpenAI, deployment=%s)", settings.azure_openai_deployment)
    else:
        _client = AsyncOpenAI(api_key=settings.openai_api_key)
        logger.info("LLM client initialized (OpenAI, model=%s)", settings.openai_model)

    return _client


def get_model_name() -> str:
    if settings.llm_provider == "azure":
        return settings.azure_openai_deployment
    return settings.openai_model
