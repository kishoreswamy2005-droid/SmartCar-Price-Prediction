"""Application configuration loaded from environment variables."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/ directory (this file lives at backend/app/config.py)
BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Runtime settings. Every value can be overridden through a `.env` file."""

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # --- General ---
    app_name: str = "SmartCar API"
    app_version: str = "1.0.0"
    environment: str = "development"
    debug: bool = True

    # --- Server ---
    host: str = "127.0.0.1"
    port: int = 8000

    # --- Security ---
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    max_request_bytes: int = 1_048_576  # 1 MiB

    # --- MongoDB ---
    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db_name: str = "smartcar"
    mongo_collection: str = "predictions"
    mongo_timeout_ms: int = 5000

    # --- Machine learning ---
    model_path: Path = BASE_DIR / "models" / "smartcar_best_model.joblib"
    dataset_path: Path = BASE_DIR / "data" / "Car details v3.csv"
    reference_year: int = 2026

    # --- Logging ---
    log_level: str = "INFO"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Return a cached settings instance."""
    return Settings()


settings = get_settings()
