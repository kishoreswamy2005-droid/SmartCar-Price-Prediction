"""Prediction endpoint."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.database import Database, get_database
from app.schemas.prediction_schema import CarPredictionRequest, PredictionResponse
from app.services import model_service, prediction_service
from app.services.prediction_service import PersistenceError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["prediction"])


@router.post(
    "/predict",
    response_model=PredictionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Predict a used-car price",
)
async def predict_car_price(
    payload: CarPredictionRequest,
    request: Request,
    db: Database = Depends(get_database),
) -> PredictionResponse:
    """Run the trained model and persist the result to MongoDB."""
    if not model_service.is_loaded():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The prediction model is not loaded. Check the model file.",
        )

    try:
        record = await prediction_service.create_prediction(payload, db)
    except model_service.PredictionError as exc:
        logger.error("Prediction failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
    except PersistenceError as exc:
        # The model answered, but storage failed. Tell the client honestly
        # instead of pretending the record was saved.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("Unexpected prediction error")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while generating the prediction.",
        ) from exc

    return record
