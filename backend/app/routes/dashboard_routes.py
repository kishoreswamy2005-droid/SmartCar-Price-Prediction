"""Health check, dashboard statistics and form metadata endpoints."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends

from app.config import settings
from app.database import Database, get_database
from app.schemas.prediction_schema import HealthResponse
from app.services import analytics_service, model_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["system"])


@router.get("/health", response_model=HealthResponse)
async def health_check(db: Database = Depends(get_database)) -> HealthResponse:
    """Report application, model, dataset and database status."""
    db_ok = await db.ping()

    dataset_loaded = analytics_service.dataset_store.is_loaded
    dataset_rows = analytics_service.dataset_store.row_count
    if not dataset_loaded:
        try:
            analytics_service.dataset_store.load()
            dataset_loaded = True
            dataset_rows = analytics_service.dataset_store.row_count
        except Exception as exc:  # noqa: BLE001 - surfaced through the response
            logger.warning("Dataset not available: %s", exc)

    model_ok = model_service.is_loaded()
    if not model_ok:
        try:
            model_service.load_model()
            model_ok = True
        except Exception as exc:  # noqa: BLE001
            logger.warning("Model not available: %s", exc)

    status_value = "ok" if (model_ok and db_ok and dataset_loaded) else "degraded"

    return HealthResponse(
        status=status_value,
        app=settings.app_name,
        version=settings.app_version,
        model_loaded=model_ok,
        model_path=str(settings.model_path) if model_ok else None,
        model_error=model_service.model_error(),
        database_connected=db_ok,
        database_error=db.error,
        dataset_loaded=dataset_loaded,
        dataset_rows=dataset_rows,
    )


@router.get("/dashboard/stats")
async def dashboard_stats(db: Database = Depends(get_database)) -> dict[str, Any]:
    """KPI cards computed from real stored prediction records."""
    return await analytics_service.dashboard_stats(db)


@router.get("/dashboard/charts")
async def dashboard_charts(db: Database = Depends(get_database)) -> dict[str, Any]:
    """Charts that must reflect real stored prediction records."""
    return await analytics_service.dashboard_charts(db)


@router.get("/meta/options")
async def form_options() -> dict[str, Any]:
    """Categorical vocabularies and searchable car names for the form."""
    try:
        if not analytics_service.dataset_store.is_loaded:
            analytics_service.dataset_store.load()
        names = analytics_service.brand_options()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Could not load car names: %s", exc)
        names = []

    return {
        "fuel": ["Petrol", "Diesel", "CNG", "LPG"],
        "seller_type": ["Dealer", "Individual", "Trustmark Dealer"],
        "transmission": ["Manual", "Automatic"],
        "owner": [
            "First Owner",
            "Second Owner",
            "Third Owner",
            "Fourth & Above Owner",
            "Test Drive Car",
        ],
        "seats": [2, 4, 5, 6, 7, 8, 9, 10],
        "year_min": 1983,
        "year_max": settings.reference_year,
        "reference_year": settings.reference_year,
        "car_names": names,
    }
