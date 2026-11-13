"""Unit tests for feature construction and validation helpers."""

from __future__ import annotations

import pytest

from app.utils.data_validation import (
    FEATURE_COLUMNS,
    build_feature_frame,
    compute_car_age,
    parse_numeric,
)
from tests.conftest import SAMPLE_PAYLOAD

EXPECTED_ORDER = [
    "name",
    "year",
    "km_driven",
    "fuel",
    "seller_type",
    "transmission",
    "owner",
    "mileage",
    "engine",
    "max_power",
    "torque",
    "seats",
    "car_age",
]


def test_feature_column_order_matches_training_contract():
    """The trained pipeline was fitted on exactly this column order."""
    assert FEATURE_COLUMNS == EXPECTED_ORDER
    assert len(FEATURE_COLUMNS) == 13


def test_build_feature_frame_shape_and_order():
    frame = build_feature_frame(SAMPLE_PAYLOAD)
    assert list(frame.columns) == EXPECTED_ORDER
    assert len(frame) == 1
    assert frame.loc[0, "name"] == "Maruti Swift Dzire VDI"
    assert int(frame.loc[0, "year"]) == 2014
    assert int(frame.loc[0, "km_driven"]) == 145500
    assert int(frame.loc[0, "car_age"]) == 12
    assert float(frame.loc[0, "mileage"]) == pytest.approx(23.4)
    assert float(frame.loc[0, "engine"]) == pytest.approx(1248.0)


def test_build_feature_frame_passes_missing_specs_as_nan():
    """Missing specs must reach the pipeline as a null the imputer fills."""
    import pandas as pd

    payload = {**SAMPLE_PAYLOAD, "mileage": None, "engine": None}
    frame = build_feature_frame(payload)
    assert pd.isna(frame.loc[0, "mileage"])
    assert pd.isna(frame.loc[0, "engine"])


def test_build_feature_frame_strips_whitespace():
    payload = {**SAMPLE_PAYLOAD, "name": "  Maruti Swift Dzire VDI  "}
    frame = build_feature_frame(payload)
    assert frame.loc[0, "name"] == "Maruti Swift Dzire VDI"


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("23.4 kmpl", 23.4),
        ("1248 CC", 1248.0),
        ("74 bhp", 74.0),
        ("190Nm@ 2000rpm", 190.0),
        (74, 74.0),
        (74.5, 74.5),
        (None, None),
        ("", None),
        ("abc", None),
        (True, None),  # booleans are not treated as measurements
        (False, None),
    ],
)
def test_parse_numeric(raw, expected):
    result = parse_numeric(raw)
    if expected is None:
        assert result is None
    else:
        assert result == pytest.approx(expected)


def test_compute_car_age_explicit_reference():
    assert compute_car_age(2020, reference_year=2026) == 6
    assert compute_car_age(2020, reference_year=2020) == 0
