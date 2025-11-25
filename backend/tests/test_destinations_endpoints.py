import pytest
from fastapi.testclient import TestClient

from backend.api.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_metadata_endpoint_returns_expected_shape(client):
    response = client.get("/destinations/metadata")
    assert response.status_code == 200
    payload = response.json()

    for key in [
        "regions",
        "countries",
        "budgets",
        "durations",
        "tags",
        "months",
        "rating_range",
        "temperature_range",
        "default_page_size",
    ]:
        assert key in payload

    assert isinstance(payload["regions"], list)
    assert isinstance(payload["months"], list)
    assert payload["rating_range"]["max"] == 5


def test_filtering_by_region_limits_results(client):
    target_region = "europe"
    response = client.get("/destinations", params={"region": target_region})
    assert response.status_code == 200
    data = response.json()

    assert data["destinations"], "Expected at least one destination in sample dataset"
    assert all(destination["region"] == target_region for destination in data["destinations"])

