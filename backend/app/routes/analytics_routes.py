"""Dataset-backed analytics endpoints."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Query, status

from app.services import analytics_service
from app.services.analytics_service import DatasetError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def _ensure_dataset() -> None:
    try:
        if not analytics_service.dataset_store.is_loaded:
            analytics_service.dataset_store.load()
    except DatasetError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Dataset unavailable: {exc}",
        ) from exc


@router.get("/overview")
async def overview() -> dict[str, Any]:
    _ensure_dataset()
    return analytics_service.overview()


@router.get("/brand-prices")
async def brand_prices(
    limit: int = Query(15, ge=1, le=50, description="Number of brands to return"),
) -> dict[str, Any]:
    _ensure_dataset()
    return analytics_service.brand_prices(limit=limit)


@router.get("/fuel-analysis")
async def fuel_analysis() -> dict[str, Any]:
    _ensure_dataset()
    return analytics_service.fuel_analysis()


@router.get("/year-analysis")
async def year_analysis() -> dict[str, Any]:
    _ensure_dataset()
    return analytics_service.year_analysis()


@router.get("/price-distribution")
async def price_distribution(
    bins: int = Query(24, ge=5, le=60, description="Histogram bucket count"),
) -> dict[str, Any]:
    _ensure_dataset()
    return analytics_service.price_distribution(bins=bins)


@router.get("/usage-analysis")
async def usage_analysis() -> dict[str, Any]:
    _ensure_dataset()
    return analytics_service.usage_analysis()
