"""Dataset-backed analytics and database-backed dashboard statistics.

Every number returned here is derived either from ``Car details v3.csv``
(cleaned exactly like the training notebook) or from real MongoDB prediction
records. Nothing is fabricated or hard-coded.
"""

from __future__ import annotations

import logging
import threading
from typing import Any

import numpy as np
import pandas as pd

from app.config import settings
from app.database import Database
from app.utils.data_validation import parse_numeric
from app.utils.time_utils import day_key

logger = logging.getLogger(__name__)


class DatasetError(RuntimeError):
    """Raised when the dataset cannot be loaded."""


class DatasetStore:
    """Loads and cleans the CarDekho dataset once, then serves aggregates."""

    def __init__(self) -> None:
        self._df: pd.DataFrame | None = None
        self._lock = threading.Lock()
        self._error: str | None = None

    @property
    def is_loaded(self) -> bool:
        return self._df is not None

    @property
    def error(self) -> str | None:
        return self._error

    @property
    def row_count(self) -> int:
        return 0 if self._df is None else int(len(self._df))

    @property
    def df(self) -> pd.DataFrame:
        if self._df is None:
            raise DatasetError("Dataset has not been loaded.")
        return self._df

    def load(self, path=None, force: bool = False) -> pd.DataFrame:
        path = path or settings.dataset_path
        if self._df is not None and not force:
            return self._df

        with self._lock:
            if self._df is not None and not force:
                return self._df

            if not path.exists():
                self._error = f"Dataset file not found: {path}"
                raise DatasetError(self._error)

            try:
                raw = pd.read_csv(path)
                cleaned = self._clean(raw)
            except DatasetError:
                raise
            except Exception as exc:
                self._error = f"Failed to load dataset: {exc}"
                logger.exception("Dataset load failed")
                raise DatasetError(self._error) from exc

            self._df = cleaned
            self._error = None
            logger.info("Loaded dataset with %d cleaned rows", len(cleaned))
            return cleaned

    @staticmethod
    def _clean(raw: pd.DataFrame) -> pd.DataFrame:
        """Reproduce the notebook's cleaning and feature engineering."""
        df = raw.copy()
        df.columns = (
            df.columns.str.strip().str.lower().str.replace(" ", "_", regex=False)
        )
        df = df.drop_duplicates().copy()

        for col in ["mileage", "engine", "max_power", "seats"]:
            if col in df.columns:
                df[col] = parse_numeric_series(df[col])

        for col in ["selling_price", "year", "km_driven"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")

        df = df.dropna(subset=["selling_price"])
        df = df[df["selling_price"] > 0].copy()

        if "year" in df.columns:
            df["car_age"] = (settings.reference_year - df["year"]).clip(lower=0)

        if "name" in df.columns:
            df["brand"] = df["name"].astype(str).str.split().str[0]

        return df.reset_index(drop=True)


def parse_numeric_series(series: pd.Series) -> pd.Series:
    return pd.to_numeric(
        series.astype(str).str.extract(r"([-+]?\d*\.?\d+)", expand=False),
        errors="coerce",
    )


dataset_store = DatasetStore()


def _series_to_records(frame: pd.DataFrame, x: str, y: str) -> list[dict[str, Any]]:
    return [
        {"x": (None if pd.isna(row[x]) else row[x]), "y": (None if pd.isna(row[y]) else row[y])}
        for _, row in frame.iterrows()
    ]


def _round(value: Any, digits: int = 2) -> float | None:
    if value is None or (isinstance(value, float) and not np.isfinite(value)):
        return None
    return round(float(value), digits)


# --------------------------------------------------------------------------
# Dataset-derived analytics
# --------------------------------------------------------------------------

def overview() -> dict[str, Any]:
    df = dataset_store.df
    prices = df["selling_price"].astype(float)

    top_brands = (
        df.groupby("brand")["selling_price"]
        .agg(["mean", "count"])
        .sort_values("count", ascending=False)
        .head(10)
    )

    return {
        "dataset_rows": int(len(df)),
        "average_price": _round(prices.mean()),
        "median_price": _round(prices.median()),
        "min_price": _round(prices.min(), 0),
        "max_price": _round(prices.max(), 0),
        "std_price": _round(prices.std()),
        "total_brands": int(df["brand"].nunique()),
        "total_models": int(df["name"].nunique()),
        "year_min": int(df["year"].min()),
        "year_max": int(df["year"].max()),
        "top_brands": [
            {"brand": str(idx), "average_price": _round(row["mean"]), "count": int(row["count"])}
            for idx, row in top_brands.iterrows()
        ],
    }


def brand_prices(limit: int = 15) -> dict[str, Any]:
    df = dataset_store.df
    grouped = (
        df.groupby("brand")["selling_price"]
        .agg(["mean", "median", "count"])
        .reset_index()
    )
    grouped = grouped[grouped["count"] >= 10]
    grouped = grouped.sort_values("mean", ascending=False).head(limit)

    return {
        "items": [
            {
                "brand": str(row["brand"]),
                "average_price": _round(row["mean"]),
                "median_price": _round(row["median"]),
                "count": int(row["count"]),
            }
            for _, row in grouped.iterrows()
        ]
    }


def fuel_analysis() -> dict[str, Any]:
    df = dataset_store.df
    grouped = (
        df.groupby("fuel")["selling_price"]
        .agg(["mean", "median", "count"])
        .reset_index()
        .sort_values("count", ascending=False)
    )
    return {
        "items": [
            {
                "fuel": str(row["fuel"]),
                "average_price": _round(row["mean"]),
                "median_price": _round(row["median"]),
                "count": int(row["count"]),
            }
            for _, row in grouped.iterrows()
        ]
    }


def year_analysis() -> dict[str, Any]:
    df = dataset_store.df
    grouped = (
        df.groupby("year")["selling_price"]
        .agg(["mean", "median", "count"])
        .reset_index()
        .sort_values("year")
    )
    return {
        "reference_year": settings.reference_year,
        "items": [
            {
                "year": int(row["year"]),
                "car_age": int(settings.reference_year - int(row["year"])),
                "average_price": _round(row["mean"]),
                "median_price": _round(row["median"]),
                "count": int(row["count"]),
            }
            for _, row in grouped.iterrows()
        ],
    }


def price_distribution(bins: int = 24) -> dict[str, Any]:
    df = dataset_store.df
    prices = df["selling_price"].astype(float).to_numpy()
    bins = max(min(bins, 60), 5)

    counts, edges = np.histogram(prices, bins=bins)
    items = [
        {
            "from": _round(edges[i], 0),
            "to": _round(edges[i + 1], 0),
            "label": f"{int(round(edges[i])):,} – {int(round(edges[i + 1])):,}",
            "count": int(counts[i]),
        }
        for i in range(len(counts))
    ]

    return {
        "items": items,
        "min_price": _round(prices.min(), 0),
        "max_price": _round(prices.max(), 0),
        "mean_price": _round(prices.mean()),
        "median_price": _round(np.median(prices)),
    }


def usage_analysis() -> dict[str, Any]:
    """Car age / odometer vs price, plus transmission comparison."""
    df = dataset_store.df

    age_bins = (
        df.groupby("car_age")["selling_price"]
        .agg(["mean", "median", "count"])
        .reset_index()
        .sort_values("car_age")
    )

    km = df.dropna(subset=["km_driven"]).copy()
    km["km_driven"] = km["km_driven"].astype(float)
    km["km_bucket"] = pd.cut(
        km["km_driven"],
        bins=[0, 10_000, 25_000, 50_000, 75_000, 100_000, 150_000, np.inf],
        labels=[
            "<10k",
            "10–25k",
            "25–50k",
            "50–75k",
            "75–100k",
            "100–150k",
            ">150k",
        ],
        include_lowest=True,
    )
    km_bins = (
        km.groupby("km_bucket", observed=False)["selling_price"]
        .agg(["mean", "median", "count"])
        .reset_index()
    )

    transmission = (
        df.groupby("transmission")["selling_price"]
        .agg(["mean", "median", "count"])
        .reset_index()
        .sort_values("mean", ascending=False)
    )

    # Sample a bounded, reproducible subset for the scatter plots.
    sample_size = min(500, len(df))
    scatter_age = df.sample(n=sample_size, random_state=42)

    km_scatter = km.sample(n=min(sample_size, len(km)), random_state=42)

    return {
        "car_age_vs_price": _series_to_records(age_bins, "car_age", "mean"),
        "car_age_bins": [
            {
                "car_age": int(row["car_age"]),
                "average_price": _round(row["mean"]),
                "median_price": _round(row["median"]),
                "count": int(row["count"]),
            }
            for _, row in age_bins.iterrows()
        ],
        "km_vs_price": [
            {"km_driven": float(row["km_driven"]), "selling_price": float(row["selling_price"])}
            for _, row in km_scatter.iterrows()
        ],
        "km_buckets": [
            {
                "bucket": str(row["km_bucket"]),
                "average_price": _round(row["mean"]),
                "median_price": _round(row["median"]),
                "count": int(row["count"]),
            }
            for _, row in km_bins.iterrows()
            if int(row["count"]) > 0
        ],
        "age_scatter": [
            {"car_age": int(row["car_age"]), "selling_price": float(row["selling_price"])}
            for _, row in scatter_age.iterrows()
        ],
        "transmission_prices": [
            {
                "transmission": str(row["transmission"]),
                "average_price": _round(row["mean"]),
                "median_price": _round(row["median"]),
                "count": int(row["count"]),
            }
            for _, row in transmission.iterrows()
        ],
    }


def brand_options(limit: int | None = None) -> list[str]:
    """Sorted distinct car names, used for the searchable form input.

    Returns every distinct name by default: the frontend filters them
    client-side, and an alphabetical cut would hide later brands entirely.
    """
    df = dataset_store.df
    names = sorted(df["name"].dropna().astype(str).unique().tolist())
    return names[:limit] if limit else names


# --------------------------------------------------------------------------
# Database-derived dashboard statistics
# --------------------------------------------------------------------------

async def dashboard_stats(db: Database) -> dict[str, Any]:
    if not db.is_connected:
        return {
            "total_predictions": 0,
            "average_price": 0.0,
            "highest_price": 0.0,
            "lowest_price": 0.0,
            "latest_price": None,
            "available": False,
        }

    pipeline = [
        {
            "$group": {
                "_id": None,
                "total": {"$sum": 1},
                "avg": {"$avg": "$predicted_price"},
                "max": {"$max": "$predicted_price"},
                "min": {"$min": "$predicted_price"},
            }
        }
    ]
    result = await db.collection.aggregate(pipeline).to_list(length=1)

    if not result:
        return {
            "total_predictions": 0,
            "average_price": 0.0,
            "highest_price": 0.0,
            "lowest_price": 0.0,
            "latest_price": None,
            "available": True,
        }

    stats = result[0]
    latest = await db.collection.find_one(
        {}, sort=[("created_at", -1)]
    )
    return {
        "total_predictions": int(stats["total"]),
        "average_price": _round(stats["avg"], 0),
        "highest_price": _round(stats["max"], 0),
        "lowest_price": _round(stats["min"], 0),
        "latest_price": _round(latest.get("predicted_price"), 0) if latest else None,
        "available": True,
    }


async def dashboard_charts(db: Database) -> dict[str, Any]:
    """Charts that must reflect real stored prediction records."""
    if not db.is_connected:
        return {"price_distribution": [], "activity": [], "available": False}

    docs = await db.collection.find(
        {},
        {"predicted_price": 1, "created_at": 1, "car_details.name": 1},
    ).to_list(length=10_000)

    if not docs:
        return {"price_distribution": [], "activity": [], "available": True}

    prices = np.array([float(d.get("predicted_price", 0)) for d in docs])
    bins = min(12, max(4, len(prices) // 3))
    counts, edges = np.histogram(prices, bins=bins)
    distribution = [
        {
            "range": f"{int(round(edges[i])):,} – {int(round(edges[i + 1])):,}",
            "count": int(counts[i]),
        }
        for i in range(len(counts))
    ]

    activity: dict[str, int] = {}
    for doc in docs:
        # ``created_at`` may come back as an ISO string from legacy records,
        # so bucket by coerced day rather than assuming a datetime.
        key = day_key(doc.get("created_at"))
        if key is None:
            continue
        activity[key] = activity.get(key, 0) + 1

    activity_series = [
        {"date": key, "count": activity[key]} for key in sorted(activity)
    ]

    return {
        "price_distribution": distribution,
        "activity": activity_series,
        "available": True,
    }
