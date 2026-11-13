"""SmartCar FastAPI application entry point."""

from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.database import database
from app.routes import analytics_routes, dashboard_routes, history_routes, model_routes, prediction_routes
from app.services import analytics_service, model_service

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("smartcar")


# ---------------------------------------------------------------------------
# Lifespan: load model, dataset and connect to MongoDB on startup
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting %s v%s", settings.app_name, settings.app_version)

    # 1. Trained model
    try:
        model_service.load_model()
        logger.info("Model ready: %s", settings.model_path)
    except Exception as exc:
        # Keep the API alive so /api/health can explain the failure.
        logger.error("Model failed to load: %s", exc)

    # 2. Dataset
    try:
        analytics_service.dataset_store.load()
        logger.info("Dataset ready: %d rows", analytics_service.dataset_store.row_count)
    except Exception as exc:
        logger.error("Dataset failed to load: %s", exc)

    # 3. MongoDB
    await database.connect()

    # 3b. Repair legacy records whose created_at was stored as a string —
    #     mixed BSON types break date sorting and crash chart bucketing.
    if database.is_connected:
        try:
            await database.normalize_created_at()
        except Exception as exc:  # noqa: BLE001 - never block startup
            logger.warning("created_at normalization skipped: %s", exc)

    yield

    await database.close()
    logger.info("Shutdown complete.")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "Used-car price prediction API powered by the trained "
        "`smartcar_best_model.joblib` scikit-learn pipeline."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)


# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    max_age=600,
)


@app.middleware("http")
async def request_guard(request: Request, call_next):
    """Enforce a request body size limit and emit structured access logs."""
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > settings.max_request_bytes:
                return JSONResponse(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    content={"detail": "Request body is too large."},
                )
        except ValueError:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"detail": "Invalid Content-Length header."},
            )

    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000
    logger.info(
        "%s %s -> %s (%.1f ms)",
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
    )
    return response


# ---------------------------------------------------------------------------
# Error handlers
# ---------------------------------------------------------------------------
@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    messages = []
    for err in exc.errors():
        location = ".".join(str(part) for part in err.get("loc", []) if part != "body")
        messages.append({"field": location or "body", "message": err.get("msg", "Invalid value")})
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Validation failed", "errors": messages},
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred."},
    )


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(dashboard_routes.router)
app.include_router(prediction_routes.router)
app.include_router(history_routes.router)
app.include_router(analytics_routes.router)
app.include_router(model_routes.router)


@app.get("/", include_in_schema=False)
async def root() -> dict[str, Any]:
    return {
        "app": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/api/health",
    }
