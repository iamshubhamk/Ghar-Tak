"""T1-13: the R2 storage adapter, tested against a mocked S3 (moto). No real credentials."""

from io import BytesIO
from urllib.parse import parse_qs, urlparse

import boto3
import pytest
from botocore.config import Config
from fastapi.testclient import TestClient
from moto import mock_aws
from pydantic import ValidationError

from app.core.config import Settings, get_settings
from app.services.storage import LocalFileStorageService, R2FileStorageService, get_storage
from tests.conftest import run

BUCKET = "ghartak-test"
PDF = b"%PDF-1.4\n" + b"0" * 64
JPG = b"\xff\xd8\xff\xe0\x00\x10JFIF" + b"\x00" * 64


@pytest.fixture
def r2(monkeypatch: pytest.MonkeyPatch):
    """Settings pointing at a mocked bucket; yields the raw boto3 client for assertions."""
    settings = get_settings()
    for name, value in {
        "storage_backend": "r2",
        "r2_account_id": "testaccount",
        "r2_access_key_id": "test-key",
        "r2_secret_access_key": "test-secret",
        "r2_bucket": BUCKET,
        "r2_endpoint_url": "",
    }.items():
        monkeypatch.setattr(settings, name, value)
    with mock_aws():
        client = boto3.client(
            "s3",
            region_name="us-east-1",
            aws_access_key_id="test-key",
            aws_secret_access_key="test-secret",
            config=Config(signature_version="s3v4"),  # what the adapter uses for R2
        )
        client.create_bucket(Bucket=BUCKET)
        yield client


def storage_on(client) -> R2FileStorageService:
    return R2FileStorageService(client=client)


def test_save_and_exists_round_trip(r2) -> None:
    storage = storage_on(r2)

    key = storage.save("private/adhaar_x.pdf", BytesIO(PDF))

    assert key == "private/adhaar_x.pdf"
    assert storage.exists("private/adhaar_x.pdf") is True
    assert storage.exists("private/missing.pdf") is False
    stored = r2.get_object(Bucket=BUCKET, Key=key)
    assert stored["Body"].read() == PDF
    assert stored["ContentType"] == "application/pdf"
    assert "private" in stored["CacheControl"]


def test_signed_url_is_short_lived_and_names_the_file(r2) -> None:
    storage = storage_on(r2)
    storage.save("private/doc.pdf", BytesIO(PDF))

    url = storage.signed_url("private/doc.pdf", 300, download_name="Aadhaar_Ram.pdf",
                             content_type="application/pdf")

    parsed = urlparse(url)
    query = parse_qs(parsed.query)
    assert parsed.path.endswith("/private/doc.pdf")
    assert query["X-Amz-Expires"] == ["300"]
    assert "X-Amz-Signature" in query
    assert query["response-content-type"] == ["application/pdf"]
    assert "Aadhaar_Ram.pdf" in query["response-content-disposition"][0]


def test_resolve_is_always_none_for_remote_storage(r2) -> None:
    assert storage_on(r2).resolve("private/anything.pdf") is None


def test_backend_is_chosen_from_settings(r2, monkeypatch) -> None:
    assert isinstance(get_storage(), R2FileStorageService)
    monkeypatch.setattr(get_settings(), "storage_backend", "local")
    assert isinstance(get_storage(), LocalFileStorageService)


def test_endpoint_defaults_to_the_account_url(monkeypatch) -> None:
    settings = Settings(
        _env_file=None,
        storage_backend="r2",
        r2_account_id="abc123",
        r2_access_key_id="k",
        r2_secret_access_key="s",
        r2_bucket="b",
    )

    assert settings.r2_endpoint == "https://abc123.r2.cloudflarestorage.com"
    assert Settings(
        _env_file=None,
        storage_backend="r2",
        r2_endpoint_url="http://localhost:9000",
        r2_access_key_id="k",
        r2_secret_access_key="s",
        r2_bucket="b",
    ).r2_endpoint == "http://localhost:9000"


def test_r2_selected_without_credentials_refuses_to_start() -> None:
    with pytest.raises(ValidationError, match="STORAGE_BACKEND=r2 needs"):
        Settings(_env_file=None, storage_backend="r2")


def test_local_is_still_the_default() -> None:
    settings = Settings(_env_file=None)

    assert settings.storage_backend == "local"
    assert settings.signed_url_ttl_seconds == 300


# ---------- end to end through the API with R2 selected ----------


def register_provider(client: TestClient) -> tuple[str, str]:
    body = client.post(
        "/api/v1/auth/register/provider",
        json={"name": "Prov", "email": "r2-prov@example.com", "password": "strongpass123"},
    ).json()
    return body["user"]["id"], body["access_token"]


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_aadhaar_goes_to_the_bucket_and_is_served_by_signed_redirect(
    r2, client: TestClient, monkeypatch
) -> None:
    monkeypatch.setattr(
        "app.services.storage.R2FileStorageService.__init__",
        lambda self, client=None: setattr(self, "bucket", BUCKET) or setattr(self, "client", r2),
    )
    provider_id, token = register_provider(client)

    upload = client.post(
        "/api/v1/provider/me/documents",
        headers=bearer(token),
        files={"adhaar_card": ("scan.pdf", PDF, "application/pdf")},
    )
    keys = [o["Key"] for o in r2.list_objects_v2(Bucket=BUCKET).get("Contents", [])]
    served = client.get(
        f"/api/v1/providers/{provider_id}/adhaar", headers=bearer(token), follow_redirects=False
    )

    assert upload.status_code == 200
    assert len(keys) == 1 and keys[0].startswith("private/") and keys[0].endswith(".pdf")
    assert served.status_code == 302
    assert "X-Amz-Signature" in served.headers["location"]
    assert served.headers["cache-control"] == "private, no-store"


def test_private_files_still_need_the_right_person(r2, client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(
        "app.services.storage.R2FileStorageService.__init__",
        lambda self, client=None: setattr(self, "bucket", BUCKET) or setattr(self, "client", r2),
    )
    provider_id, token = register_provider(client)
    client.post(
        "/api/v1/provider/me/documents",
        headers=bearer(token),
        files={"adhaar_card": ("scan.pdf", PDF, "application/pdf")},
    )
    customer = client.post(
        "/api/v1/auth/register/customer",
        json={"name": "Cust", "email": "r2-cust@example.com", "password": "strongpass123"},
    ).json()["access_token"]

    anonymous = client.get(f"/api/v1/providers/{provider_id}/adhaar", follow_redirects=False)
    as_customer = client.get(
        f"/api/v1/providers/{provider_id}/adhaar", headers=bearer(customer), follow_redirects=False
    )

    assert anonymous.status_code == 401
    assert as_customer.status_code == 403


def test_missing_remote_file_is_a_404(r2, client: TestClient, db, monkeypatch) -> None:
    monkeypatch.setattr(
        "app.services.storage.R2FileStorageService.__init__",
        lambda self, client=None: setattr(self, "bucket", BUCKET) or setattr(self, "client", r2),
    )
    provider_id, token = register_provider(client)
    run(
        db.users.update_one(
            {"id": provider_id},
            {"$set": {"provider_profile.adhaar_card_filename": "gone.pdf"}},
        )
    )

    response = client.get(
        f"/api/v1/providers/{provider_id}/adhaar", headers=bearer(token), follow_redirects=False
    )

    assert response.status_code == 404


def test_adapter_built_from_settings_signs_for_the_r2_endpoint(r2) -> None:
    url = R2FileStorageService().signed_url("private/x.pdf", 120)

    parsed = urlparse(url)
    assert parsed.hostname == f"{BUCKET}.testaccount.r2.cloudflarestorage.com" or (
        parsed.hostname == "testaccount.r2.cloudflarestorage.com"
        and parsed.path.startswith(f"/{BUCKET}/")
    )
    query = parse_qs(parsed.query)
    assert query["X-Amz-Algorithm"] == ["AWS4-HMAC-SHA256"]
    assert query["X-Amz-Expires"] == ["120"]
    assert "/auto/s3/aws4_request" in query["X-Amz-Credential"][0]


def test_public_redirect_serves_images_only(r2, monkeypatch) -> None:
    from app.services.uploads import public_upload_redirect

    storage = storage_on(r2)
    storage.save("public/photo.jpg", BytesIO(JPG))
    storage.save("public/page.html", BytesIO(b"<html>"))
    monkeypatch.setattr(
        "app.services.uploads.get_storage", lambda: storage
    )

    ok = public_upload_redirect("photo.jpg")

    assert ok.status_code == 302 and "X-Amz-Signature" in ok.headers["location"]
    for name in ("page.html", "missing.jpg", "../private/x.pdf"):
        with pytest.raises(Exception) as error:
            public_upload_redirect(name)
        assert getattr(error.value, "status_code", None) == 404
