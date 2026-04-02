from __future__ import annotations

import logging
from typing import cast

from openai import AsyncOpenAI

from app.config import settings
from app.models.chat_models import ChatProviderId, ChatProviderInfo, ChatProvidersResponse
from app.utils.error_handler import ValidationError

logger = logging.getLogger(__name__)

_CLIENTS: dict[ChatProviderId, AsyncOpenAI] = {}


def _normalize_ollama_base_url(base_url: str) -> str:
    normalized = base_url.strip().rstrip("/")
    if not normalized:
        return ""
    if not normalized.endswith("/v1"):
        normalized = f"{normalized}/v1"
    return normalized


def _build_provider_info() -> list[ChatProviderInfo]:
    return [
        ChatProviderInfo(
            id="openai",
            label="OpenAI",
            enabled=bool(settings.openai_api_key.strip() and settings.openai_model.strip()),
            model=settings.openai_model.strip() or None,
        ),
        ChatProviderInfo(
            id="ollama",
            label="Ollama",
            enabled=bool(_normalize_ollama_base_url(settings.ollama_base_url) and settings.ollama_model.strip()),
            model=settings.ollama_model.strip() or None,
        ),
    ]


def get_chat_providers() -> ChatProvidersResponse:
    providers = _build_provider_info()
    enabled_provider_ids = {provider.id for provider in providers if provider.enabled}

    configured_default = settings.llm_provider.strip().lower()
    default_provider: ChatProviderId | None = None
    if configured_default in enabled_provider_ids:
        default_provider = cast(ChatProviderId, configured_default)
    else:
        default_provider = next((provider.id for provider in providers if provider.enabled), None)

    return ChatProvidersResponse(default_provider=default_provider, providers=providers)


def resolve_provider(provider: ChatProviderId | None) -> ChatProviderId:
    provider_info = {item.id: item for item in _build_provider_info()}

    if provider is not None:
        if not provider_info[provider].enabled:
            raise ValidationError(f"Chat provider '{provider}' is not configured")
        return provider

    default_provider = get_chat_providers().default_provider
    if default_provider is None:
        raise ValidationError("No chat provider is configured")
    return default_provider


def get_llm_client(provider: ChatProviderId) -> AsyncOpenAI:
    client = _CLIENTS.get(provider)
    if client is not None:
        return client

    if provider == "openai":
        client = AsyncOpenAI(api_key=settings.openai_api_key)
        logger.info("LLM client initialized (OpenAI, model=%s)", settings.openai_model)
    else:
        client = AsyncOpenAI(
            api_key=settings.ollama_api_key or "ollama",
            base_url=_normalize_ollama_base_url(settings.ollama_base_url),
        )
        logger.info("LLM client initialized (Ollama, model=%s, base_url=%s)", settings.ollama_model, _normalize_ollama_base_url(settings.ollama_base_url))

    _CLIENTS[provider] = client
    return client


def get_model_name(provider: ChatProviderId) -> str:
    if provider == "openai":
        return settings.openai_model
    return settings.ollama_model
