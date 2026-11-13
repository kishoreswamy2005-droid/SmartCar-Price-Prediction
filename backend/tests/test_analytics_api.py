"""Integration tests for dataset-backed analytics and dashboard endpoints.

Expected values are the real aggregates of ``Car details v3.csv`` after the
notebook's cleaning pipeline (6926 rows); they act as regression guards
against accidental changes to the cleaning logic.
"""

from __future__ import annotations

import pytest

pytestmark = pytest.mark.usefixtures("reset_db")


@pytest.fixture(autouse=True)
def _app(api_client):
    return api_client


# ---------------------------------------------------------------------------
# Dataset-derived analytics
# ---------------------------------------------------------------------------
def test_overview_matches_training_dataset(api_client):
    body = api_client.get("/api/analytics/overview").json()

    assert body["dataset_rows"] == 6926
    assert body["min_price"] == pytest.approx(29_999.0)
    assert body["max_price"] == pytest.approx(10_000_000.0)
    assert body["median_price"] == pytest.approx(400_000.0)
    assert body["average_price"] == pytest.approx(517_270.68, abs=0.5)
    assert body["std_price"] == pytest.approx(519_766.99, abs=0.5)
    assert body["total_brands"] == 32
    assert body["total_models"] == 2058
    assert body["year_min"] == 1983
    assert body["year_max"] == 2020


def test_overview_top_brands_are_ordered_by_popularity(api_client):
    top = api_client.get("/api/analytics/overview").json()["top_brands"]

    assert len(top) == 10
    assert top[0]["brand"] == "Maruti"
    assert top[0]["count"] == 2165
    counts = [entry["count"] for entry in top]
    assert counts == sorted(counts, reverse=True)
    for entry in top:
        assert entry["average_price"] > 0


def test_brand_prices_sorted_by_average_descending(api_client):
    items = api_client.get("/api/analytics/brand-prices").json()["items"]

    assert len(items) == 15
    means = [entry["average_price"] for entry in items]
    assert means == sorted(means, reverse=True)
    assert items[0]["brand"] == "BMW"
    assert items[0]["average_price"] == pytest.approx(2_770_638.3, abs=1)
    for entry in items:
        assert entry["count"] >= 10  # small-sample brands are excluded
        assert entry["median_price"] > 0


def test_brand_prices_honours_limit(api_client):
    items = api_client.get("/api/analytics/brand-prices", params={"limit": 5}).json()[
        "items"
    ]
    assert len(items) == 5


def test_fuel_analysis_covers_all_four_fuels(api_client):
    items = api_client.get("/api/analytics/fuel-analysis").json()["items"]

    assert [entry["fuel"] for entry in items] == ["Diesel", "Petrol", "CNG", "LPG"]
    counts = {entry["fuel"]: entry["count"] for entry in items}
    assert counts["Diesel"] == 3755
    assert counts["Petrol"] == 3077
    assert counts["CNG"] == 56
    assert counts["LPG"] == 38
    assert sum(counts.values()) == 6926


def test_year_analysis_is_chronological_with_car_age(api_client):
    body = api_client.get("/api/analytics/year-analysis").json()
    items = body["items"]

    assert body["reference_year"] == 2026
    assert len(items) == 29
    years = [entry["year"] for entry in items]
    assert years == sorted(years)
    assert years[0] == 1983
    assert years[-1] == 2020
    for entry in items:
        assert entry["car_age"] == 2026 - entry["year"]
        assert entry["count"] > 0
        assert entry["average_price"] > 0


def test_price_distribution_bins_add_up_to_dataset(api_client):
    body = api_client.get("/api/analytics/price-distribution").json()
    items = body["items"]

    assert len(items) == 24
    assert sum(entry["count"] for entry in items) == 6926
    assert body["min_price"] == pytest.approx(29_999.0)
    assert body["max_price"] == pytest.approx(10_000_000.0)
    assert body["median_price"] == pytest.approx(400_000.0)
    # Bins must be contiguous and increasing.
    for previous, current in zip(items, items[1:]):
        assert previous["to"] == current["from"]


def test_price_distribution_honours_bin_count(api_client):
    body = api_client.get("/api/analytics/price-distribution", params={"bins": 10}).json()
    assert len(body["items"]) == 10
    assert sum(entry["count"] for entry in body["items"]) == 6926


def test_usage_analysis_shape(api_client):
    body = api_client.get("/api/analytics/usage-analysis").json()

    assert set(body) == {
        "car_age_vs_price",
        "car_age_bins",
        "km_vs_price",
        "km_buckets",
        "age_scatter",
        "transmission_prices",
    }

    # Age profile: 29 distinct ages (6..43), chronological.
    ages = [entry["car_age"] for entry in body["car_age_bins"]]
    assert len(ages) == 29
    assert ages == sorted(ages)
    assert ages[0] == 6 and ages[-1] == 43

    # All odometer buckets are populated and cover every row.
    buckets = {entry["bucket"]: entry["count"] for entry in body["km_buckets"]}
    assert buckets == {
        "<10k": 323,
        "10–25k": 716,
        "25–50k": 1571,
        "50–75k": 1360,
        "75–100k": 1390,
        "100–150k": 1186,
        ">150k": 380,
    }
    assert sum(buckets.values()) == 6926

    # Transmission comparison, most expensive first.
    transmission = body["transmission_prices"]
    assert [entry["transmission"] for entry in transmission] == ["Automatic", "Manual"]
    assert transmission[0]["average_price"] == pytest.approx(1_309_712.3, abs=1)
    assert transmission[0]["count"] == 584
    assert transmission[1]["count"] == 6342

    # Bounded, reproducible scatter samples.
    assert len(body["age_scatter"]) == 500
    assert len(body["km_vs_price"]) == 500
    assert len(body["car_age_vs_price"]) == 29


# ---------------------------------------------------------------------------
# Dashboard statistics (MongoDB-backed)
# ---------------------------------------------------------------------------
def test_dashboard_stats_empty_history(api_client):
    body = api_client.get("/api/dashboard/stats").json()
    assert body == {
        "total_predictions": 0,
        "average_price": 0.0,
        "highest_price": 0.0,
        "lowest_price": 0.0,
        "latest_price": None,
        "available": True,
    }


def test_dashboard_stats_reflect_stored_predictions(api_client, seed_history):
    seed_history(10)  # prices 500k..410k, newest = seed0 = 500k

    body = api_client.get("/api/dashboard/stats").json()
    assert body["available"] is True
    assert body["total_predictions"] == 10
    assert body["highest_price"] == pytest.approx(500_000.0)
    assert body["lowest_price"] == pytest.approx(410_000.0)
    assert body["average_price"] == pytest.approx(455_000.0)
    # Latest record by created_at is seed9 -> 410k.
    assert body["latest_price"] == pytest.approx(410_000.0)


def test_dashboard_stats_update_after_new_prediction(api_client, seed_history):
    seed_history(2)
    created = api_client.post(
        "/api/predict",
        json={
            "name": "Maruti Swift Dzire VDI",
            "year": 2014,
            "km_driven": 145500,
            "fuel": "Diesel",
            "seller_type": "Individual",
            "transmission": "Manual",
            "owner": "First Owner",
        },
    ).json()

    body = api_client.get("/api/dashboard/stats").json()
    assert body["total_predictions"] == 3
    assert body["highest_price"] == pytest.approx(
        max(500_000.0, created["predicted_price"])
    )


def test_dashboard_charts_empty_history(api_client):
    body = api_client.get("/api/dashboard/charts").json()
    assert body == {"price_distribution": [], "activity": [], "available": True}


def test_dashboard_charts_reflect_stored_predictions(api_client, seed_history):
    seed_history(6)

    body = api_client.get("/api/dashboard/charts").json()
    assert body["available"] is True

    # Price histogram buckets sum to the number of stored predictions.
    assert len(body["price_distribution"]) >= 4
    assert sum(entry["count"] for entry in body["price_distribution"]) == 6

    # All seeds land on the same day (12:00 + i minutes).
    assert len(body["activity"]) == 1
    assert body["activity"][0]["date"] == "2026-10-01"
    assert body["activity"][0]["count"] == 6
    assert [entry["date"] for entry in body["activity"]] == sorted(
        entry["date"] for entry in body["activity"]
    )
