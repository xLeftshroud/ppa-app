from __future__ import annotations

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_path: str = "models/pipeline.joblib"
    metadata_path: str = "models/metadata.json"
    training_data_path: str = "data/dataset.csv"
    cors_origins: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
    max_upload_size_mb: int = 50
    log_level: str = "INFO"

    # Chat LLM Configuration
    llm_provider: str = "openai"  # default provider: "openai" or "ollama"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    ollama_base_url: str = "http://localhost:11434/v1"
    ollama_model: str = ""
    ollama_api_key: str = "ollama"
    chat_max_history: int = 20
    chat_max_tool_rounds: int = 8

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
