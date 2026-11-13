"""Model inference service.

Loads the uploaded ``smartcar_best_model.joblib`` once, validates the feature
contract, and produces a real numeric prediction from the saved estimator.
"""

from __future__ import annotations

import json
import logging
import warnings
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from app.config import settings
from app.utils.data_validation import FEATURE_COLUMNS, build_feature_frame
from app.utils.model_loader import ModelLoadError, model_loader

logger = logging.getLogger(__name__)

MODEL_NAME = "Linear Regression"
MODEL_DISCLAIMER = (
    "This is an estimate produced by a machine-learning model trained on the "
    "CarDekho dataset. It is not a guaranteed market price."
)

# The saved pipeline's imputer was fitted on four all-empty columns, so
# scikit-learn warns on every call. The behaviour is intentional and identical
# to the notebook, so we silence only that specific warning.
_EMPTY_COLUMN_WARNING = "Skipping features without any observed values"


class PredictionError(RuntimeError):
    """Raised when the model cannot produce a usable prediction."""


def load_model() -> Any:
    """Load the trained model, raising a descriptive error on failure."""
    return model_loader.load(settings.model_path)


def is_loaded() -> bool:
    return model_loader.is_loaded


def model_error() -> str | None:
    return model_loader.error


def model_info() -> dict[str, Any]:
    """Metadata about the loaded estimator for the About page / health check."""
    info: dict[str, Any] = {
        "model_name": MODEL_NAME,
        "algorithm": "LinearRegression",
        "framework": "scikit-learn",
        "features": list(FEATURE_COLUMNS),
        "reference_year": settings.reference_year,
        "loaded": model_loader.is_loaded,
    }
    try:
        model = model_loader.model
        info["n_features_in"] = int(getattr(model, "n_features_in_", 0) or 0)
        preprocessor = model.named_steps.get("preprocessor")
        if preprocessor is not None:
            info["effective_numeric_features"] = [
                str(c) for c in preprocessor.transformers_[0][2]
            ]
            info["effective_categorical_features"] = [
                str(c) for c in preprocessor.transformers_[1][2]
            ]
        estimator = model.named_steps.get("model")
        if estimator is not None:
            info["intercept"] = float(getattr(estimator, "intercept_", np.nan))
    except Exception as exc:  # pragma: no cover - defensive
        logger.debug("Could not read model metadata: %s", exc)
    return info


def load_metrics(path: Path) -> dict[str, Any]:
    """Read the evaluation metrics transcribed from the training notebook."""
    if not path.exists():
        raise FileNotFoundError(f"Metrics artifact not found: {path}")
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def predict(payload: dict[str, Any]) -> float:
    """Run inference and return the predicted price in INR."""
    try:
        model = load_model()
    except ModelLoadError as exc:
        raise PredictionError(str(exc)) from exc

    frame = build_feature_frame(payload)

    try:
        with warnings.catch_warnings():
            warnings.filterwarnings("ignore", message=f".*{_EMPTY_COLUMN_WARNING}.*")
            raw = model.predict(frame)
    except ModelLoadError as exc:
        raise PredictionError(str(exc)) from exc
    except Exception as exc:
        logger.exception("Model inference failed")
        raise PredictionError(f"Model inference failed: {exc}") from exc

    if raw is None or len(raw) == 0:
        raise PredictionError("Model returned no prediction.")

    value = float(raw[0])
    if not np.isfinite(value):
        raise PredictionError("Model returned a non-finite value.")

    # The model was trained on positive prices; clamp tiny negative artefacts.
    return max(value, 0.0)
