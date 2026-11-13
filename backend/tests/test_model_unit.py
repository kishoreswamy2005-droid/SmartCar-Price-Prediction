"""Unit tests for model loading and raw inference (no HTTP, no database)."""

from __future__ import annotations

import math

import pytest

from app.services import model_service
from app.utils.data_validation import compute_car_age
from tests.conftest import SAMPLE_EXPECTED_PRICE, SAMPLE_PAYLOAD


def test_model_loads_once_and_stays_cached():
    model = model_service.load_model()
    assert model_service.is_loaded() is True
    assert model_service.model_error() is None
    # Second call must reuse the cached estimator instead of re-reading disk.
    assert model_service.load_model() is model


def test_model_metadata_matches_shipped_pipeline():
    info = model_service.model_info()
    assert info["model_name"] == "Linear Regression"
    assert info["algorithm"] == "LinearRegression"
    assert info["framework"] == "scikit-learn"
    assert info["loaded"] is True
    assert info["n_features_in"] == 13
    assert isinstance(info["intercept"], float)
    assert math.isfinite(info["intercept"])
    assert len(info["features"]) == 13


def test_notebook_sample_prediction_matches_training_output():
    """The API must reproduce the notebook's reported ₹511,800 sample."""
    price = model_service.predict(SAMPLE_PAYLOAD)
    assert price == pytest.approx(SAMPLE_EXPECTED_PRICE, abs=0.01)


def test_prediction_is_deterministic():
    first = model_service.predict(SAMPLE_PAYLOAD)
    second = model_service.predict(SAMPLE_PAYLOAD)
    assert first == second


def test_car_age_uses_reference_year_2026():
    assert compute_car_age(2014) == 12
    assert compute_car_age(2026) == 0
    assert compute_car_age(1983) == 43
    # A future model year must not produce a negative age.
    assert compute_car_age(2030) == 0


def test_optional_specifications_do_not_change_the_prediction():
    """mileage/engine/max_power/seats were all-NaN at training time.

    The notebook's extraction regex never matched, so the fitted imputer
    dropped those four columns. Serving must behave identically whether the
    user supplies them, omits them, or supplies garbage extremes.
    """
    baseline = model_service.predict(SAMPLE_PAYLOAD)

    rich = {
        **SAMPLE_PAYLOAD,
        "mileage": 0.0,
        "engine": 1.0,
        "max_power": 1.0,
        "seats": 1.0,
    }
    bare = {
        **SAMPLE_PAYLOAD,
        "mileage": None,
        "engine": None,
        "max_power": None,
        "seats": None,
    }
    assert model_service.predict(rich) == pytest.approx(baseline, abs=1e-6)
    assert model_service.predict(bare) == pytest.approx(baseline, abs=1e-6)


def test_unseen_categories_are_handled_without_crashing():
    """Unknown car name / torque values must still yield a finite price."""
    payload = {
        **SAMPLE_PAYLOAD,
        "name": "Not In Dataset EV 9000",
        "torque": "9999Nm@ 1rpm",
    }
    price = model_service.predict(payload)
    assert math.isfinite(price)
    assert price >= 0.0


def test_string_specifications_are_parsed_like_the_notebook():
    """'23.4 kmpl' style inputs must parse to their numeric part."""
    payload = {
        **SAMPLE_PAYLOAD,
        "mileage": "23.4 kmpl",
        "engine": "1248 CC",
        "max_power": "74 bhp",
        "seats": "5",
    }
    price = model_service.predict(payload)
    assert price == pytest.approx(SAMPLE_EXPECTED_PRICE, abs=0.01)


def test_model_disclaimer_is_present():
    assert "not a guaranteed market price" in model_service.MODEL_DISCLAIMER
    assert model_service.MODEL_NAME == "Linear Regression"
