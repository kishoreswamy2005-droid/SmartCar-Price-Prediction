"""Integration tests for /api/health, /api/predict and /api/meta/options."""

from __future__ import annotations

import re

import pytest

from tests.conftest import SAMPLE_EXPECTED_PRICE, SAMPLE_PAYLOAD

pytestmark = pytest.mark.usefixtures("reset_db")


@pytest.fixture(autouse=True)
def _app(api_client):
    """Boot the app once per session; isolate every test in a clean DB."""
    return api_client


def test_health_reports_every_subsystem(api_client):
    resp = api_client.get("/api/health")
    assert resp.status_code == 200
    body = resp.json()

    assert body["status"] == "ok"
    assert body["app"] == "SmartCar API"
    assert body["model_loaded"] is True
    assert body["model_error"] is None
    assert body["database_connected"] is True
    assert body["database_error"] is None
    assert body["dataset_loaded"] is True
    # Cleaning must reproduce the notebook's 6926 training rows.
    assert body["dataset_rows"] == 6926


def test_predict_returns_notebook_price(api_client):
    resp = api_client.post("/api/predict", json=SAMPLE_PAYLOAD)
    assert resp.status_code == 201

    body = resp.json()
    assert body["predicted_price"] == pytest.approx(SAMPLE_EXPECTED_PRICE, abs=0.01)
    assert body["currency"] == "INR"
    assert body["model_name"] == "Linear Regression"
    assert "not a guaranteed market price" in body["disclaimer"]


def test_predict_response_shape(api_client):
    body = api_client.post("/api/predict", json=SAMPLE_PAYLOAD).json()

    assert re.fullmatch(r"[0-9a-f]{32}", body["prediction_id"])
    assert body["created_at"]

    details = body["car_details"]
    assert details["name"] == "Maruti Swift Dzire VDI"
    assert details["year"] == 2014
    assert details["car_age"] == 12  # 2026 reference year
    assert details["fuel"] == "Diesel"
    assert details["mileage"] == pytest.approx(23.4)
    assert details["seats"] == pytest.approx(5.0)


def test_predict_persists_record_to_history(api_client):
    created = api_client.post("/api/predict", json=SAMPLE_PAYLOAD).json()

    history = api_client.get("/api/predictions")
    assert history.status_code == 200
    body = history.json()

    assert body["total"] == 1
    assert body["items"][0]["prediction_id"] == created["prediction_id"]
    assert body["items"][0]["predicted_price"] == pytest.approx(
        SAMPLE_EXPECTED_PRICE, abs=0.01
    )


@pytest.mark.parametrize(
    ("patch", "expected_field"),
    [
        ({"name": ""}, "name"),
        ({"name": "   "}, "name"),
        ({"year": 1900}, "year"),
        ({"year": 2030}, "year"),
        ({"km_driven": -1}, "km_driven"),
        ({"fuel": "Electric"}, "fuel"),
        ({"seller_type": "Auction House"}, "seller_type"),
        ({"transmission": "CVT"}, "transmission"),
        ({"owner": "Sixth Owner"}, "owner"),
        ({"mileage": -5}, "mileage"),
        ({"seats": 99}, "seats"),
    ],
)
def test_predict_rejects_invalid_values(api_client, patch, expected_field):
    resp = api_client.post("/api/predict", json={**SAMPLE_PAYLOAD, **patch})
    assert resp.status_code == 422

    body = resp.json()
    assert body["detail"] == "Validation failed"
    fields = {error["field"] for error in body["errors"]}
    assert expected_field in fields


def test_predict_rejects_missing_required_fields(api_client):
    resp = api_client.post("/api/predict", json={"name": "Maruti Swift"})
    assert resp.status_code == 422
    fields = {error["field"] for error in resp.json()["errors"]}
    # Everything except the provided name must be reported as missing.
    assert "year" in fields and "fuel" in fields and "km_driven" in fields


def test_predict_ignores_unknown_extra_fields(api_client):
    resp = api_client.post(
        "/api/predict", json={**SAMPLE_PAYLOAD, "hacker_field": "ignore me"}
    )
    assert resp.status_code == 201


def test_model_info_exposes_notebook_metrics(api_client):
    """Metrics must come from the notebook artifact, not from thin air."""
    body = api_client.get("/api/model/info").json()

    assert body["algorithm"] == "LinearRegression"
    assert body["model_name"] == "Linear Regression"
    assert body["n_features_in"] == 13
    assert body["serialized_with"] == "scikit-learn 1.6.1"
    assert body["loaded"] is True
    assert len(body["features"]) == 13
    assert isinstance(body["intercept"], float)

    evaluation = body["evaluation"]
    assert evaluation["best_model"] == "Linear Regression"
    assert len(evaluation["metrics"]) == 4

    linear = evaluation["metrics"]["Linear Regression"]
    assert linear["mae"] == pytest.approx(95266.716710)
    assert linear["rmse"] == pytest.approx(255037.314897)
    assert linear["r2"] == pytest.approx(0.703431)

    assert evaluation["split"] == {
        "test_size": 0.2,
        "random_state": 42,
        "train_rows": 5540,
        "test_rows": 1386,
    }
    assert evaluation["dataset"]["cleaned_rows"] == 6926
    assert evaluation["dataset"]["raw_rows"] == 8128
    assert evaluation["dataset"]["duplicate_rows"] == 1202


def test_meta_options_returns_dataset_vocabulary(api_client):
    body = api_client.get("/api/meta/options").json()

    assert body["fuel"] == ["Petrol", "Diesel", "CNG", "LPG"]
    assert body["seller_type"] == ["Dealer", "Individual", "Trustmark Dealer"]
    assert body["transmission"] == ["Manual", "Automatic"]
    assert len(body["owner"]) == 5
    assert body["year_min"] == 1983
    assert body["year_max"] == 2026
    assert body["reference_year"] == 2026

    # Full, untruncated car-name vocabulary for the searchable combobox.
    names = body["car_names"]
    assert len(names) == 2058
    assert names == sorted(names)  # alphabetical, ready for client filtering
    assert any(name.startswith("Toyota") for name in names)
    assert any(name.startswith("Maruti") for name in names)
