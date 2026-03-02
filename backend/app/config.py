from __future__ import annotations

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_path: str = "app/ml/pipeline.joblib"
    metadata_path: str = "app/ml/metadata.json"
    training_data_path: str = "data/top10_skus_rows.csv"
    cors_origins: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
    max_upload_size_mb: int = 50
    log_level: str = "INFO"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
