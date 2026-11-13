"""Integration tests for prediction history: search, sort, paging, delete."""

from __future__ import annotations

import pytest

from tests.conftest import SAMPLE_EXPECTED_PRICE, SAMPLE_PAYLOAD

pytestmark = pytest.mark.usefixtures("reset_db")


@pytest.fixture(autouse=True)
def _app(api_client):
    return api_client


# ---------------------------------------------------------------------------
# Pagination & sorting
# ---------------------------------------------------------------------------
def test_pagination_reports_total_and_pages(api_client, seed_history):
    seed_history(25)

    first = api_client.get("/api/predictions", params={"page": 1, "page_size": 10})
    assert first.status_code == 200
    body = first.json()
    assert body["total"] == 25
    assert body["page"] == 1
    assert body["page_size"] == 10
    assert body["total_pages"] == 3
    assert len(body["items"]) == 10

    last = api_client.get("/api/predictions", params={"page": 3, "page_size": 10}).json()
    assert len(last["items"]) == 5
    assert last["page"] == 3


def test_pagination_never_exceeds_total(api_client, seed_history):
    seed_history(3)
    body = api_client.get("/api/predictions", params={"page": 99}).json()
    assert body["items"] == []
    assert body["total"] == 3


def test_default_sort_is_newest_first(api_client, seed_history):
    seed_history(10)
    items = api_client.get("/api/predictions").json()["items"]
    ids = [item["prediction_id"] for item in items]
    assert ids == sorted(ids, reverse=True)  # seed ids increase with time


def test_sort_by_price_ascending(api_client, seed_history):
    seed_history(10)
    items = api_client.get(
        "/api/predictions",
        params={"sort_by": "predicted_price", "sort_dir": "asc", "page_size": 100},
    ).json()["items"]
    prices = [item["predicted_price"] for item in items]
    assert prices == sorted(prices)
    assert prices[0] == pytest.approx(410_000.0)  # seed9


def test_sort_by_price_descending(api_client, seed_history):
    seed_history(10)
    items = api_client.get(
        "/api/predictions",
        params={"sort_by": "predicted_price", "sort_dir": "desc", "page_size": 100},
    ).json()["items"]
    assert items[0]["predicted_price"] == pytest.approx(500_000.0)  # seed0


def test_sort_by_car_name_ascending(api_client, seed_history):
    seed_history(9)
    items = api_client.get(
        "/api/predictions",
        params={"sort_by": "car_name", "sort_dir": "asc", "page_size": 100},
    ).json()["items"]
    names = [item["car_details"]["name"] for item in items]
    assert names == sorted(names)


def test_invalid_sort_field_is_rejected(api_client):
    resp = api_client.get("/api/predictions", params={"sort_by": "password"})
    assert resp.status_code == 422


@pytest.mark.parametrize("params", [{"page": 0}, {"page_size": 0}, {"page_size": 101}])
def test_invalid_paging_is_rejected(api_client, params):
    assert api_client.get("/api/predictions", params=params).status_code == 422


# ---------------------------------------------------------------------------
# Search & filters
# ---------------------------------------------------------------------------
def test_search_by_car_name(api_client, seed_history):
    seed_history(25)  # names cycle through 3 values -> 9 "Maruti Swift VDI"
    body = api_client.get("/api/predictions", params={"search": "Swift"}).json()
    assert body["total"] == 9
    assert all("Swift" in item["car_details"]["name"] for item in body["items"])


def test_search_is_case_insensitive(api_client, seed_history):
    seed_history(25)
    body = api_client.get("/api/predictions", params={"search": "honda city"}).json()
    assert body["total"] == 8  # name cycle: Honda lands on indices 1,4,...,22
    assert all("Honda City VX" == item["car_details"]["name"] for item in body["items"])


def test_search_matches_prediction_id(api_client, seed_history):
    seed_history(5)
    body = api_client.get("/api/predictions", params={"search": "seed0003"}).json()
    assert body["total"] == 1
    assert body["items"][0]["prediction_id"] == "seed0003"


def test_search_with_regex_metacharacters_is_safe(api_client, seed_history):
    """A literal '(' or '.*' from a user must not become a server error."""
    seed_history(5)
    for term in ["(", "a[b", ".*", "seed000(1", "+", "$$$"]:
        resp = api_client.get("/api/predictions", params={"search": term})
        assert resp.status_code == 200, f"search {term!r} failed: {resp.text}"
        assert resp.json()["total"] == 0


def test_search_with_no_matches_returns_empty_page(api_client, seed_history):
    seed_history(5)
    body = api_client.get("/api/predictions", params={"search": "Delorean"}).json()
    assert body["total"] == 0
    assert body["items"] == []
    assert body["total_pages"] == 0


def test_fuel_filter(api_client, seed_history):
    seed_history(25)  # fuels cycle Petrol/Diesel/CNG -> 9/8/8
    body = api_client.get("/api/predictions", params={"fuel": "Petrol"}).json()
    assert body["total"] == 9
    assert all(item["car_details"]["fuel"] == "Petrol" for item in body["items"])


def test_price_range_filter(api_client, seed_history):
    seed_history(25)  # prices 500k down to 260k in 10k steps
    body = api_client.get(
        "/api/predictions",
        params={"min_price": 400_000, "max_price": 460_000, "page_size": 100},
    ).json()
    assert body["total"] == 7  # 400k..460k inclusive -> seeds 4..10
    for item in body["items"]:
        assert 400_000 <= item["predicted_price"] <= 460_000


def test_min_price_greater_than_max_is_rejected(api_client):
    resp = api_client.get(
        "/api/predictions", params={"min_price": 500_000, "max_price": 100_000}
    )
    assert resp.status_code == 422


def test_combined_search_fuel_and_sort(api_client, seed_history):
    seed_history(30)
    body = api_client.get(
        "/api/predictions",
        params={
            "search": "Creta",
            "fuel": "Diesel",
            "sort_by": "predicted_price",
            "sort_dir": "asc",
            "page_size": 100,
        },
    ).json()
    assert body["total"] > 0
    prices = [item["predicted_price"] for item in body["items"]]
    assert prices == sorted(prices)
    for item in body["items"]:
        assert "Creta" in item["car_details"]["name"]
        assert item["car_details"]["fuel"] == "Diesel"


# ---------------------------------------------------------------------------
# Single record, delete, clear, fuel options
# ---------------------------------------------------------------------------
def test_get_single_prediction(api_client, seed_history):
    seed_history(3)
    resp = api_client.get("/api/predictions/seed0001")
    assert resp.status_code == 200
    body = resp.json()
    assert body["prediction_id"] == "seed0001"
    assert body["car_details"]["name"] == "Honda City VX"
    assert body["predicted_price"] == pytest.approx(490_000.0)


def test_get_unknown_prediction_is_404(api_client):
    resp = api_client.get("/api/predictions/does-not-exist")
    assert resp.status_code == 404
    assert "does-not-exist" in resp.json()["detail"]


def test_delete_prediction(api_client, seed_history):
    seed_history(3)
    resp = api_client.delete("/api/predictions/seed0002")
    assert resp.status_code == 200
    assert resp.json() == {"deleted": True, "prediction_id": "seed0002"}

    assert api_client.get("/api/predictions").json()["total"] == 2
    assert api_client.delete("/api/predictions/seed0002").status_code == 404
    assert api_client.delete("/api/predictions/nope").status_code == 404


def test_clear_history_removes_everything(api_client, seed_history):
    seed_history(12)
    resp = api_client.delete("/api/predictions")
    assert resp.status_code == 200
    assert resp.json() == {"deleted": True, "count": 12}

    body = api_client.get("/api/predictions").json()
    assert body["total"] == 0
    assert body["items"] == []


def test_fuel_options_reflect_stored_history(api_client, seed_history):
    seed_history(6)
    resp = api_client.get("/api/predictions/fuel-options")
    assert resp.status_code == 200
    assert resp.json() == ["CNG", "Diesel", "Petrol"]


def test_fuel_options_empty_without_history(api_client):
    assert api_client.get("/api/predictions/fuel-options").json() == []


# ---------------------------------------------------------------------------
# Real model round trip through history
# ---------------------------------------------------------------------------
def test_real_prediction_round_trip(api_client):
    created = api_client.post("/api/predict", json=SAMPLE_PAYLOAD).json()
    pid = created["prediction_id"]

    found = api_client.get("/api/predictions", params={"search": pid}).json()
    assert found["total"] == 1

    detail = api_client.get(f"/api/predictions/{pid}").json()
    assert detail["predicted_price"] == pytest.approx(SAMPLE_EXPECTED_PRICE, abs=0.01)
    assert detail["car_details"]["car_age"] == 12

    assert api_client.delete(f"/api/predictions/{pid}").status_code == 200
    assert api_client.get(f"/api/predictions/{pid}").status_code == 404
    assert api_client.get("/api/predictions").json()["total"] == 0
