from fastapi.testclient import TestClient


def test_root_returns_service_metadata(client: TestClient) -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert response.json()["service"] == "GharTak API"
