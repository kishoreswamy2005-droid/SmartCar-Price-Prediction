"""End-to-end user journeys through the HTTP API.

These tests walk the exact sequence the React UI performs — health check,
form metadata, prediction, dashboard, history search, analytics, cleanup —
against the real model and a real MongoDB.
"""

from __future__ import annotations

import pytest

from tests.conftest import SAMPLE_EXPECTED_PRICE, SAMPLE_PAYLOAD

pytestmark = pytest.mark.usefixtures("reset_db")


@pytest.fixture(autouse=True)
def _app(api_client):
    return api_client


def test_full_prediction_journey(api_client):
    # 1. The app reports healthy before the user does anything.
    health = api_client.get("/api/health").json()
    assert health["status"] == "ok"
    assert health["model_loaded"] and health["database_connected"]

    # 2. The form loads its vocabulary (names, fuel types, year bounds).
    options = api_client.get("/api/meta/options").json()
    assert "Diesel" in options["fuel"]
    assert len(options["car_names"]) == 2058

    # 3. The user submits the form and gets a real model prediction.
    resp = api_client.post("/api/predict", json=SAMPLE_PAYLOAD)
    assert resp.status_code == 201
    record = resp.json()
    assert record["predicted_price"] == pytest.approx(SAMPLE_EXPECTED_PRICE, abs=0.01)
    pid = record["prediction_id"]

    # 4. Dashboard KPIs immediately include the new record.
    stats = api_client.get("/api/dashboard/stats").json()
    assert stats["total_predictions"] == 1
    assert stats["latest_price"] == pytest.approx(record["predicted_price"], abs=1)

    charts = api_client.get("/api/dashboard/charts").json()
    assert sum(entry["count"] for entry in charts["price_distribution"]) == 1

    # 5. The history page lists it and can find it by search.
    history = api_client.get("/api/predictions").json()
    assert history["total"] == 1
    found = api_client.get("/api/predictions", params={"search": "Swift Dzire"}).json()
    assert found["total"] == 1
    assert found["items"][0]["prediction_id"] == pid

    # 6. The detail view returns the full record.
    detail = api_client.get(f"/api/predictions/{pid}").json()
    assert detail["car_details"]["car_age"] == 12
    assert detail["predicted_price"] == pytest.approx(SAMPLE_EXPECTED_PRICE, abs=0.01)

    # 7. Analytics stay dataset-backed regardless of stored predictions.
    overview = api_client.get("/api/analytics/overview").json()
    assert overview["dataset_rows"] == 6926

    # 8. The user deletes the record and history is empty again.
    assert api_client.delete(f"/api/predictions/{pid}").status_code == 200
    assert api_client.get(f"/api/predictions/{pid}").status_code == 404
    assert api_client.get("/api/predictions").json()["total"] == 0
    assert api_client.get("/api/dashboard/stats").json()["total_predictions"] == 0


def test_invalid_form_submission_then_correction(api_client):
    # The form is submitted with a future model year -> field-level errors.
    bad = {**SAMPLE_PAYLOAD, "year": 2031}
    resp = api_client.post("/api/predict", json=bad)
    assert resp.status_code == 422
    errors = resp.json()["errors"]
    assert any(error["field"] == "year" for error in errors)

    # Nothing was persisted by the failed attempt.
    assert api_client.get("/api/predictions").json()["total"] == 0

    # The user fixes the year and the corrected submission succeeds.
    fixed = api_client.post("/api/predict", json=SAMPLE_PAYLOAD)
    assert fixed.status_code == 201
    assert api_client.get("/api/predictions").json()["total"] == 1


def test_multi_record_history_workflow(api_client):
    # A user runs three predictions with different inputs.
    inputs = [
        SAMPLE_PAYLOAD,
        {**SAMPLE_PAYLOAD, "name": "Maruti Swift VDI", "fuel": "Petrol", "year": 2018},
        {**SAMPLE_PAYLOAD, "name": "Hyundai Creta SX", "transmission": "Automatic"},
    ]
    created = [api_client.post("/api/predict", json=payload).json() for payload in inputs]

    # KPIs reflect all three.
    stats = api_client.get("/api/dashboard/stats").json()
    assert stats["total_predictions"] == 3
    prices = [record["predicted_price"] for record in created]
    assert stats["highest_price"] == pytest.approx(max(prices), abs=1)
    assert stats["lowest_price"] == pytest.approx(min(prices), abs=1)
    assert stats["average_price"] == pytest.approx(sum(prices) / 3, abs=1)

    # Pagination works with real records.
    page = api_client.get("/api/predictions", params={"page_size": 2}).json()
    assert page["total"] == 3
    assert page["total_pages"] == 2
    assert len(page["items"]) == 2

    # Fuel filter reflects stored data; the fuel-options list matches.
    petrol = api_client.get("/api/predictions", params={"fuel": "Petrol"}).json()
    assert petrol["total"] == 1
    assert api_client.get("/api/predictions/fuel-options").json() == [
        "Diesel",
        "Petrol",
    ]

    # Clear all history in one action.
    cleared = api_client.delete("/api/predictions").json()
    assert cleared == {"deleted": True, "count": 3}
    assert api_client.get("/api/predictions").json()["total"] == 0


def test_persistence_failure_is_reported_honestly(api_client, monkeypatch):
    """If Mongo insert fails, the API must say so instead of lying."""
    from app.routes import prediction_routes
    from app.services import prediction_service

    class _FailingService:
        @staticmethod
        async def create_prediction(payload, db):
            raise prediction_service.PersistenceError(
                "Prediction was generated but could not be saved to history."
            )

    monkeypatch.setattr(prediction_routes, "prediction_service", _FailingService)

    resp = api_client.post("/api/predict", json=SAMPLE_PAYLOAD)
    assert resp.status_code == 503
    assert "could not be saved" in resp.json()["detail"]
    # The failed save left nothing behind.
    assert api_client.get("/api/predictions").json()["total"] == 0
