"""Feature construction helpers that mirror the training notebook exactly.

The notebook (``SmartCar_Used_Car_Price_Prediction.ipynb``) defines:

* ``car_age = (REFERENCE_YEAR - year).clip(lower=0)`` with ``REFERENCE_YEAR = 2026``
* 13 model inputs: ``name, year, km_driven, fuel, seller_type, transmission,
  owner, mileage, engine, max_power, torque, seats, car_age``

Everything here keeps the serving path aligned with that training contract.
"""

from __future__ import annotations

import re
from typing import Any, Mapping

import pandas as pd

from app.config import settings

#: Exact column order expected by the trained pipeline.
FEATURE_COLUMNS: list[str] = [
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

CATEGORICAL_FEATURES: list[str] = [
    "name",
    "fuel",
    "seller_type",
    "transmission",
    "owner",
    "torque",
]

NUMERIC_FEATURES: list[str] = [
    "year",
    "km_driven",
    "mileage",
    "engine",
    "max_power",
    "seats",
    "car_age",
]

# Extracts the first number out of a text-with-units value such as
# "23.4 kmpl", "1248 CC" or "74 bhp".
_NUMBER_RE = re.compile(r"[-+]?\d*\.?\d+")


def parse_numeric(value: Any) -> float | None:
    """Return the first numeric token in ``value`` as a float, else ``None``."""
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    match = _NUMBER_RE.search(str(value))
    if not match:
        return None
    try:
        return float(match.group())
    except ValueError:
        return None


def compute_car_age(year: int, reference_year: int | None = None) -> int:
    """Derive ``car_age`` exactly as the notebook does."""
    reference = reference_year if reference_year is not None else settings.reference_year
    return max(reference - int(year), 0)


def build_feature_frame(payload: Mapping[str, Any]) -> pd.DataFrame:
    """Build the single-row DataFrame the saved pipeline expects.

    Missing numeric specifications are passed through as ``NaN`` so the
    trained imputer handles them, matching notebook behaviour.
    """
    mileage = parse_numeric(payload.get("mileage"))
    engine = parse_numeric(payload.get("engine"))
    max_power = parse_numeric(payload.get("max_power"))
    seats = parse_numeric(payload.get("seats"))

    row: dict[str, Any] = {
        "name": str(payload["name"]).strip(),
        "year": int(payload["year"]),
        "km_driven": int(payload["km_driven"]),
        "fuel": str(payload["fuel"]).strip(),
        "seller_type": str(payload["seller_type"]).strip(),
        "transmission": str(payload["transmission"]).strip(),
        "owner": str(payload["owner"]).strip(),
        "mileage": mileage,
        "engine": engine,
        "max_power": max_power,
        "torque": str(payload.get("torque") or "").strip(),
        "seats": seats,
        "car_age": compute_car_age(int(payload["year"])),
    }

    return pd.DataFrame([row], columns=FEATURE_COLUMNS)
