"""Prediction orchestration: validate, infer, persist, respond."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from app.database import Database
from app.schemas.prediction_schema import (
    CarDetails,
    CarPredictionRequest,
    PredictionRecord,
)
from app.services import model_service
from app.utils.data_validation import compute_car_age

logger = logging.getLogger(__name__)


class PersistenceError(RuntimeError):
    """Raised when a prediction succeeds but cannot be stored."""


def _build_details(payload: CarPredictionRequest) -> CarDetails:
    return CarDetails(
        name=payload.name,
        year=payload.year,
        km_driven=payload.km_driven,
        fuel=payload.fuel,
        seller_type=payload.seller_type,
        transmission=payload.transmission,
        owner=payload.owner,
        mileage=payload.mileage,
        engine=payload.engine,
        max_power=payload.max_power,
        torque=payload.torque,
        seats=payload.seats,
        car_age=compute_car_age(payload.year),
    )


async def create_prediction(
    payload: CarPredictionRequest, db: Database
) -> PredictionRecord:
    """Run the model, store the result, and return the API record."""
    details = _build_details(payload)

    predicted_price = model_service.predict(payload.model_dump())

    prediction_id = uuid.uuid4().hex
    created_at = datetime.now(timezone.utc)

    document: dict[str, Any] = {
        "prediction_id": prediction_id,
        "car_name": details.name,
        "year": details.year,
        "km_driven": details.km_driven,
        "fuel": details.fuel,
        "seller_type": details.seller_type,
        "transmission": details.transmission,
        "owner": details.owner,
        "mileage": details.mileage,
        "engine": details.engine,
        "max_power": details.max_power,
        "torque": details.torque,
        "seats": details.seats,
        "car_age": details.car_age,
        "predicted_price": predicted_price,
        "currency": "INR",
        "model_name": model_service.MODEL_NAME,
        "created_at": created_at,
    }

    if db.is_connected:
        try:
            await db.collection.insert_one(document)
        except Exception as exc:
            # A storage failure must not hide a valid model prediction.
            logger.error("Failed to persist prediction %s: %s", prediction_id, exc)
            raise PersistenceError(
                "Prediction was generated but could not be saved to history."
            ) from exc
    else:
        logger.warning(
            "MongoDB unavailable; prediction %s returned without persistence.",
            prediction_id,
        )

    return PredictionRecord(
        prediction_id=prediction_id,
        predicted_price=predicted_price,
        currency="INR",
        car_details=details,
        created_at=created_at,
        model_name=model_service.MODEL_NAME,
        disclaimer=model_service.MODEL_DISCLAIMER,
    )


def document_to_record(document: dict[str, Any]) -> PredictionRecord:
    """Convert a MongoDB document into the API response model."""
    details = CarDetails(
        name=document.get("car_name", ""),
        year=int(document.get("year", 0)),
        km_driven=int(document.get("km_driven", 0)),
        fuel=document.get("fuel", ""),
        seller_type=document.get("seller_type", ""),
        transmission=document.get("transmission", ""),
        owner=document.get("owner", ""),
        mileage=document.get("mileage"),
        engine=document.get("engine"),
        max_power=document.get("max_power"),
        torque=document.get("torque", "") or "",
        seats=document.get("seats"),
        car_age=int(document.get("car_age", 0)),
    )
    return PredictionRecord(
        prediction_id=document.get("prediction_id", ""),
        predicted_price=float(document.get("predicted_price", 0.0)),
        currency="INR",
        car_details=details,
        created_at=document.get("created_at"),
        model_name=document.get("model_name"),
        disclaimer=model_service.MODEL_DISCLAIMER,
    )
