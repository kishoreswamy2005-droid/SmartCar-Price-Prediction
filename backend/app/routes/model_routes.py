"""Model information endpoint for the About / Model Info page."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, status

from app.config import settings
from app.services import model_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["model"])


@router.get("/model/info")
async def model_info() -> dict[str, Any]:
    """Return live model metadata plus metrics read from the notebook artifact.

    Metrics come from ``data/model_metrics.json``, which was transcribed from
    the training notebook's evaluation cells — nothing is computed at runtime
    and nothing is invented.
    """
    if not model_service.is_loaded():
        try:
            model_service.load_model()
        except Exception as exc:  # noqa: BLE001 - surfaced to the client
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"The model is not available: {exc}",
            ) from exc

    info = model_service.model_info()

    try:
        metrics = model_service.load_metrics(settings.dataset_path.parent / "model_metrics.json")
    except Exception as exc:  # noqa: BLE001
        logger.warning("Metrics artifact unavailable: %s", exc)
        metrics = None

    return {
        **info,
        "serialized_with": "scikit-learn 1.6.1",
        "disclaimer": model_service.MODEL_DISCLAIMER,
        "evaluation": metrics,
    }
