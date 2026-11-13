"""Shared fixtures for the SmartCar backend test suite.

The database override MUST happen before any ``app.*`` import because
``Settings`` is instantiated at import time. Tests always run against a
dedicated ``smartcar_test`` database so a developer's real prediction
history is never touched.
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta
from typing import Any, Callable, Iterator

os.environ["MONGO_DB_NAME"] = "smartcar_test"

import pytest
from fastapi.testclient import TestClient
from pymongo import MongoClient

from app.config import settings
from app.main import app

# The exact sample used in the training notebook's evaluation cell.
SAMPLE_PAYLOAD: dict[str, Any] = {
    "name": "Maruti Swift Dzire VDI",
    "year": 2014,
    "km_driven": 145500,
    "fuel": "Diesel",
    "seller_type": "Individual",
    "transmission": "Manual",
    "owner": "First Owner",
    "mileage": 23.4,
    "engine": 1248,
    "max_power": 74.0,
    "torque": "190Nm@ 2000rpm",
    "seats": 5,
}

# The price the notebook reports for that exact sample.
SAMPLE_EXPECTED_PRICE = 511800.24454245


@pytest.fixture(scope="session")
def api_client() -> Iterator[TestClient]:
    """TestClient with lifespan enabled: loads model, dataset and MongoDB."""
    with TestClient(app) as client:
        yield client


@pytest.fixture(scope="session")
def mongo() -> Iterator[MongoClient]:
    client = MongoClient(settings.mongo_uri, serverSelectionTimeoutMS=5000)
    yield client
    client.close()


@pytest.fixture
def reset_db(mongo: MongoClient) -> Iterator[None]:
    """Empty the test database before and after every test."""
    collection = mongo[settings.mongo_db_name][settings.mongo_collection]
    collection.delete_many({})
    yield
    collection.delete_many({})


@pytest.fixture
def seed_history(mongo: MongoClient) -> Callable[..., list[dict[str, Any]]]:
    """Insert synthetic prediction documents for history/dashboard tests.

    ``predicted_price`` *decreases* as ``created_at`` increases so sort tests
    can tell a price sort apart from a date sort.
    """

    def _seed(count: int = 25) -> list[dict[str, Any]]:
        collection = mongo[settings.mongo_db_name][settings.mongo_collection]
        # Index-aligned with ``names`` below: Creta (index 2) must be Diesel.
        fuels = ["Petrol", "CNG", "Diesel"]
        names = ["Maruti Swift VDI", "Honda City VX", "Hyundai Creta S"]
        base_time = datetime(2026, 10, 1, 12, 0, 0)

        docs: list[dict[str, Any]] = []
        for i in range(count):
            docs.append(
                {
                    "prediction_id": f"seed{i:04d}",
                    "car_name": names[i % len(names)],
                    "year": 2015,
                    "km_driven": 40_000 + i * 1_000,
                    "fuel": fuels[i % len(fuels)],
                    "seller_type": "Dealer",
                    "transmission": "Manual" if i % 2 else "Automatic",
                    "owner": "First Owner",
                    "mileage": 20.0,
                    "engine": 1197.0,
                    "max_power": 82.0,
                    "torque": "140Nm@ 3000rpm",
                    "seats": 5.0,
                    "car_age": 11,
                    "predicted_price": float(500_000 - i * 10_000),
                    "currency": "INR",
                    "model_name": "Linear Regression",
                    "created_at": base_time + timedelta(minutes=i),
                }
            )
        collection.insert_many(docs)
        return docs

    return _seed
