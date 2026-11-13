"""Lazy, thread-safe loader for the trained SmartCar model.

The uploaded ``smartcar_best_model.joblib`` is loaded exactly once and never
modified. It was serialised with scikit-learn 1.6.1, so the backend pins that
version; if loading fails we surface the real cause instead of swapping the
model for a substitute.
"""

from __future__ import annotations

import logging
import threading
from pathlib import Path
from typing import Any

import joblib

logger = logging.getLogger(__name__)


class ModelLoadError(RuntimeError):
    """Raised when the trained model cannot be loaded or is unusable."""


class ModelLoader:
    """Loads and caches a single scikit-learn estimator."""

    def __init__(self) -> None:
        self._model: Any | None = None
        self._lock = threading.Lock()
        self._path: Path | None = None
        self._error: str | None = None

    @property
    def is_loaded(self) -> bool:
        return self._model is not None

    @property
    def error(self) -> str | None:
        return self._error

    @property
    def path(self) -> Path | None:
        return self._path

    def load(self, path: Path, force: bool = False) -> Any:
        """Load the model from ``path`` once and cache it."""
        if self._model is not None and not force and self._path == path:
            return self._model

        with self._lock:
            if self._model is not None and not force and self._path == path:
                return self._model

            if not path.exists():
                self._error = f"Model file not found: {path}"
                raise ModelLoadError(self._error)

            try:
                model = joblib.load(path)
            except Exception as exc:  # joblib raises many pickle-specific types
                self._error = f"Failed to load model: {exc}"
                logger.exception("Model load failed for %s", path)
                raise ModelLoadError(self._error) from exc

            if not hasattr(model, "predict"):
                self._error = "Loaded object is not a scikit-learn estimator."
                raise ModelLoadError(self._error)

            self._model = model
            self._path = path
            self._error = None
            logger.info("Loaded model from %s", path)
            return model

    @property
    def model(self) -> Any:
        if self._model is None:
            raise ModelLoadError("Model has not been loaded yet.")
        return self._model

    def reset(self) -> None:
        with self._lock:
            self._model = None
            self._path = None
            self._error = None


model_loader = ModelLoader()
