"""Prediction history endpoints."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.database import Database, get_database
from app.schemas.prediction_schema import PredictionListResponse, PredictionRecord
from app.services import history_service
from app.services.history_service import HistoryError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["history"])


def _history_http_error(exc: HistoryError) -> HTTPException:
    if "not connected" in str(exc).lower():
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is unavailable. Prediction history cannot be read.",
        )
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=str(exc),
    )


@router.get("/predictions", response_model=PredictionListResponse)
async def list_predictions(
    page: int = Query(1, ge=1, description="1-based page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    search: str | None = Query(None, max_length=100, description="Free-text search"),
    fuel: str | None = Query(None, max_length=50, description="Fuel type filter"),
    min_price: float | None = Query(None, ge=0, description="Minimum predicted price"),
    max_price: float | None = Query(None, ge=0, description="Maximum predicted price"),
    sort_by: str = Query(
        "created_at",
        pattern="^(created_at|predicted_price|car_name|year|km_driven)$",
    ),
    sort_dir: str = Query("desc", pattern="^(asc|desc)$"),
    db: Database = Depends(get_database),
) -> PredictionListResponse:
    """Return paginated prediction history with search, filters and sorting."""
    if min_price is not None and max_price is not None and min_price > max_price:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="min_price must not be greater than max_price.",
        )

    try:
        return await history_service.list_predictions(
            db,
            page=page,
            page_size=page_size,
            search=search,
            fuel=fuel,
            min_price=min_price,
            max_price=max_price,
            sort_by=sort_by,
            sort_dir=sort_dir,
        )
    except HistoryError as exc:
        raise _history_http_error(exc) from exc


@router.get("/predictions/fuel-options", response_model=list[str])
async def fuel_options(db: Database = Depends(get_database)) -> list[str]:
    """Distinct fuel values available in the stored history."""
    return await history_service.fuel_options(db)


@router.get("/predictions/{prediction_id}", response_model=PredictionRecord)
async def get_prediction(
    prediction_id: str,
    db: Database = Depends(get_database),
) -> PredictionRecord:
    try:
        record = await history_service.get_prediction(db, prediction_id)
    except HistoryError as exc:
        raise _history_http_error(exc) from exc

    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Prediction '{prediction_id}' was not found.",
        )
    return record


@router.delete(
    "/predictions/{prediction_id}",
    status_code=status.HTTP_200_OK,
)
async def delete_prediction(
    prediction_id: str,
    db: Database = Depends(get_database),
) -> dict:
    try:
        deleted = await history_service.delete_prediction(db, prediction_id)
    except HistoryError as exc:
        raise _history_http_error(exc) from exc

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Prediction '{prediction_id}' was not found.",
        )
    return {"deleted": True, "prediction_id": prediction_id}


@router.delete("/predictions", status_code=status.HTTP_200_OK)
async def clear_history(db: Database = Depends(get_database)) -> dict:
    """Delete every stored prediction. The frontend asks for confirmation."""
    try:
        count = await history_service.clear_history(db)
    except HistoryError as exc:
        raise _history_http_error(exc) from exc
    return {"deleted": True, "count": count}
