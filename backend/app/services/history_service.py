"""Prediction history persistence and querying."""

from __future__ import annotations

import logging
import re
from typing import Any

from pymongo import DESCENDING, ASCENDING
from pymongo.errors import PyMongoError

from app.database import Database
from app.schemas.prediction_schema import PredictionListResponse, PredictionRecord
from app.services.prediction_service import document_to_record

logger = logging.getLogger(__name__)

SORTABLE_FIELDS = {
    "created_at": "created_at",
    "predicted_price": "predicted_price",
    "car_name": "car_name",
    "year": "year",
    "km_driven": "km_driven",
}


class HistoryError(RuntimeError):
    """Raised when a history operation fails."""


def _build_filter(
    search: str | None,
    fuel: str | None,
    min_price: float | None,
    max_price: float | None,
) -> dict[str, Any]:
    query: dict[str, Any] = {}

    if search:
        # Escape user input: it is matched as a regex, and an unbalanced
        # bracket (e.g. "(") would otherwise be a server error.
        regex = {"$regex": re.escape(search.strip()), "$options": "i"}
        query["$or"] = [
            {"car_name": regex},
            {"prediction_id": regex},
            {"fuel": regex},
            {"transmission": regex},
            {"owner": regex},
        ]

    if fuel:
        query["fuel"] = fuel

    price_filter: dict[str, Any] = {}
    if min_price is not None:
        price_filter["$gte"] = min_price
    if max_price is not None:
        price_filter["$lte"] = max_price
    if price_filter:
        query["predicted_price"] = price_filter

    return query


async def list_predictions(
    db: Database,
    *,
    page: int = 1,
    page_size: int = 10,
    search: str | None = None,
    fuel: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    sort_by: str = "created_at",
    sort_dir: str = "desc",
) -> PredictionListResponse:
    """Return a filtered, sorted, paginated slice of prediction history."""
    if not db.is_connected:
        raise HistoryError("Database is not connected.")

    query = _build_filter(search, fuel, min_price, max_price)
    field = SORTABLE_FIELDS.get(sort_by, "created_at")
    direction = ASCENDING if sort_dir.lower() == "asc" else DESCENDING

    try:
        total = await db.collection.count_documents(query)
        cursor = (
            db.collection.find(query)
            .sort(field, direction)
            .skip((page - 1) * page_size)
            .limit(page_size)
        )
        documents = await cursor.to_list(length=page_size)
    except PyMongoError as exc:
        logger.exception("Failed to list predictions")
        raise HistoryError(f"Could not read prediction history: {exc}") from exc

    items = [document_to_record(doc) for doc in documents]
    total_pages = max((total + page_size - 1) // page_size, 1) if total else 0

    return PredictionListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


async def get_prediction(db: Database, prediction_id: str) -> PredictionRecord | None:
    if not db.is_connected:
        raise HistoryError("Database is not connected.")
    try:
        document = await db.collection.find_one({"prediction_id": prediction_id})
    except PyMongoError as exc:
        raise HistoryError(f"Could not read prediction: {exc}") from exc
    return document_to_record(document) if document else None


async def delete_prediction(db: Database, prediction_id: str) -> bool:
    if not db.is_connected:
        raise HistoryError("Database is not connected.")
    try:
        result = await db.collection.delete_one({"prediction_id": prediction_id})
    except PyMongoError as exc:
        raise HistoryError(f"Could not delete prediction: {exc}") from exc
    return result.deleted_count > 0


async def clear_history(db: Database) -> int:
    if not db.is_connected:
        raise HistoryError("Database is not connected.")
    try:
        result = await db.collection.delete_many({})
    except PyMongoError as exc:
        raise HistoryError(f"Could not clear history: {exc}") from exc
    return int(result.deleted_count)


async def fuel_options(db: Database) -> list[str]:
    """Distinct fuel values present in history, for the filter dropdown."""
    if not db.is_connected:
        return []
    try:
        values = await db.collection.distinct("fuel")
    except PyMongoError:
        return []
    return sorted(str(v) for v in values if v)
