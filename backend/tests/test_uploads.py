"""AR-005: every upload goes through one validator; skill proofs are private (test plan §3.2)."""

import json
import re
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.services.uploads import PublicUploadFiles
from scripts.audit_uploads import audit
from tests.conftest import run

JPG = b"\xff\xd8\xff\xe0\x00\x10JFIF" + b"\x00" * 64
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
WEBP = b"RIFF\x24\x00\x00\x00WEBPVP8 " + b"\x00" * 64
PDF = b"%PDF-1.4\n" + b"0" * 64
HTML = b"<html><script>alert(document.cookie)</script></html>"
UUID_NAME = re.compile(
    r"^(adhaar_|bank_proof_|skill_proof_)?"
    r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
    r"\.(jpg|png|webp|pdf)$"
)


@pytest.fixture
def upload_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    monkeypatch.setattr(get_settings(), "local_upload_dir", tmp_path)
    return tmp_path


def files(folder: Path) -> list[Path]:
    return [p for p in folder.rglob("*") if p.is_file()]


def register_customer(client: TestClient, email: str = "up-cust@example.com") -> str:
    return client.post(
        "/api/v1/auth/register/customer",
        json={"name": "Cust", "email": email, "password": "strongpass123"},
    ).json()["access_token"]


def register_provider(client: TestClient, email: str = "up-prov@example.com") -> tuple[str, str]:
    body = client.post(
        "/api/v1/auth/register/provider",
        json={"name": "Prov", "email": email, "password": "strongpass123"},
    ).json()
    return body["user"]["id"], body["access_token"]


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


# ---------- customer photo ----------


def test_customer_photo_is_stored_with_a_server_chosen_name(client, upload_dir) -> None:
    token = register_customer(client)

    response = client.post(
        "/api/v1/customer/me/photo",
        headers=bearer(token),
        files={"profile_photo": ("holiday.JPEG", JPG, "image/jpeg")},
    )

    assert response.status_code == 200
    stored = files(upload_dir / "public")
    assert len(stored) == 1
    assert UUID_NAME.match(stored[0].name) and stored[0].suffix == ".jpg"
    assert response.json()["customer_profile"]["profile_photo_url"] == f"/uploads/{stored[0].name}"


@pytest.mark.parametrize(
    ("name", "content_type"),
    [("x.html", "image/png"), ("x.png", "image/png"), ("x.svg", "image/svg+xml")],
)
def test_disguised_html_is_rejected(client, upload_dir, name, content_type) -> None:
    token = register_customer(client)

    response = client.post(
        "/api/v1/customer/me/photo",
        headers=bearer(token),
        files={"profile_photo": (name, HTML, content_type)},
    )

    assert response.status_code == 415
    assert response.json()["detail"]["error"]["code"] == "UPLOAD_TYPE_NOT_ALLOWED"
    assert files(upload_dir) == []


def test_extension_comes_from_content_not_filename(client, upload_dir) -> None:
    token = register_customer(client)

    client.post(
        "/api/v1/customer/me/photo",
        headers=bearer(token),
        files={"profile_photo": ("evil.html", PNG, "text/html")},
    )

    assert [p.suffix for p in files(upload_dir / "public")] == [".png"]


def test_pdf_is_not_allowed_as_a_photo(client, upload_dir) -> None:
    token = register_customer(client)

    response = client.post(
        "/api/v1/customer/me/photo",
        headers=bearer(token),
        files={"profile_photo": ("cv.pdf", PDF, "application/pdf")},
    )

    assert response.status_code == 415


def test_oversize_photo_is_rejected(client, upload_dir, monkeypatch) -> None:
    monkeypatch.setattr(get_settings(), "upload_max_photo_bytes", 100)
    token = register_customer(client)

    response = client.post(
        "/api/v1/customer/me/photo",
        headers=bearer(token),
        files={"profile_photo": ("big.jpg", JPG + b"\x00" * 200, "image/jpeg")},
    )

    assert response.status_code == 413
    assert response.json()["detail"]["error"]["code"] == "UPLOAD_TOO_LARGE"
    assert files(upload_dir) == []


# ---------- provider documents ----------


def test_provider_documents_go_to_the_right_folders(client, upload_dir) -> None:
    provider_id, token = register_provider(client)

    response = client.post(
        "/api/v1/provider/me/documents",
        headers=bearer(token),
        files={
            "profile_photo": ("me.webp", WEBP, "image/webp"),
            "adhaar_card": ("scan.pdf", PDF, "application/pdf"),
        },
    )

    assert response.status_code == 200
    assert [p.suffix for p in files(upload_dir / "public")] == [".webp"]
    private = files(upload_dir / "private")
    assert len(private) == 1 and UUID_NAME.match(private[0].name) and private[0].suffix == ".pdf"
    aadhaar = client.get(f"/api/v1/providers/{provider_id}/adhaar", headers=bearer(token))
    assert aadhaar.status_code == 200
    assert aadhaar.headers["content-type"] == "application/pdf"
    assert aadhaar.headers["x-content-type-options"] == "nosniff"


def test_provider_documents_reject_html_aadhaar(client, upload_dir) -> None:
    _, token = register_provider(client)

    response = client.post(
        "/api/v1/provider/me/documents",
        headers=bearer(token),
        files={"adhaar_card": ("scan.pdf", HTML, "application/pdf")},
    )

    assert response.status_code == 415
    assert files(upload_dir) == []


# ---------- provider registration form and resubmit ----------


def form_fields(email: str) -> dict[str, str]:
    return {
        "name": "Form Prov",
        "email": email,
        "phone": "9876500001",
        "password": "strongpass123",
        "bank_account_holder": "Form Prov",
        "bank_account_number": "123456789012",
        "bank_ifsc": "SBIN0000001",
    }


def test_registration_form_stores_all_files_safely(client, upload_dir) -> None:
    response = client.post(
        "/api/v1/auth/register/provider",
        data=form_fields("form-ok@example.com"),
        files={
            "adhaar_card": ("a.jpg", JPG, "image/jpeg"),
            "bank_proof": ("b.pdf", PDF, "application/pdf"),
            "profile_photo": ("p.png", PNG, "image/png"),
        },
    )

    assert response.status_code == 201
    names = [p.name for p in files(upload_dir)]
    assert len(names) == 3 and all(UUID_NAME.match(n) for n in names)
    assert len(files(upload_dir / "public")) == 1
    assert len(files(upload_dir / "private")) == 2


def test_registration_form_rejects_bad_file_and_saves_nothing(client, upload_dir) -> None:
    response = client.post(
        "/api/v1/auth/register/provider",
        data=form_fields("form-bad@example.com"),
        files={
            "adhaar_card": ("a.jpg", JPG, "image/jpeg"),
            "profile_photo": ("p.png", HTML, "image/png"),
        },
    )

    assert response.status_code == 415
    assert files(upload_dir) == []


def test_resubmit_rejects_html_aadhaar(client, upload_dir) -> None:
    _, token = register_provider(client, "resub@example.com")

    response = client.post(
        "/api/v1/provider/me/resubmit",
        headers=bearer(token),
        files={"adhaar_card": ("a.pdf", HTML, "application/pdf")},
    )

    assert response.status_code == 415
    assert files(upload_dir) == []


# ---------- skill proofs ----------


@pytest.fixture
def skill_request(client, db, upload_dir, admin_token):
    provider_id, provider_token = register_provider(client, "skill-owner@example.com")
    response = client.post(
        "/api/v1/provider/me/skill-requests",
        headers=bearer(provider_token),
        data={"category_name": "Plumber"},
        files={"proof_file": ("certificate.pdf", PDF, "application/pdf")},
    )
    assert response.status_code == 200, response.text
    return {
        "body": response.json(),
        "provider_token": provider_token,
        "admin_token": admin_token,
    }


def test_skill_proof_is_private_and_served_through_an_authenticated_route(
    client, skill_request, upload_dir
) -> None:
    body = skill_request["body"]

    assert body["proof_url"] == f"/api/v1/skill-requests/{body['id']}/proof"
    assert files(upload_dir / "public") == []
    private = files(upload_dir / "private")
    assert len(private) == 1 and private[0].name.startswith("skill_proof_")
    assert private[0].suffix == ".pdf"


def test_skill_proof_readable_by_admin_and_owner(client, skill_request) -> None:
    url = skill_request["body"]["proof_url"]

    admin = client.get(url, headers=bearer(skill_request["admin_token"]))
    owner = client.get(url, headers=bearer(skill_request["provider_token"]))

    for response in (admin, owner):
        assert response.status_code == 200
        assert response.content == PDF
        assert response.headers["x-content-type-options"] == "nosniff"


def test_skill_proof_forbidden_for_other_provider_and_customer(client, skill_request) -> None:
    url = skill_request["body"]["proof_url"]
    _, other_provider = register_provider(client, "skill-other@example.com")
    customer = register_customer(client, "skill-cust@example.com")

    assert client.get(url, headers=bearer(other_provider)).status_code == 403
    assert client.get(url, headers=bearer(customer)).status_code == 403


def test_skill_proof_requires_login(client, skill_request) -> None:
    assert client.get(skill_request["body"]["proof_url"]).status_code == 401


def test_skill_proof_html_is_rejected(client, upload_dir) -> None:
    _, token = register_provider(client, "skill-html@example.com")

    response = client.post(
        "/api/v1/provider/me/skill-requests",
        headers=bearer(token),
        data={"category_name": "Plumber"},
        files={"proof_file": ("proof.png", HTML, "image/png")},
    )

    assert response.status_code == 415
    assert files(upload_dir) == []


def test_legacy_skill_proof_in_uploads_root_is_still_readable_by_admin(
    client, db, upload_dir, admin_token
) -> None:
    (upload_dir / "skill_proof_old.png").write_bytes(PNG)
    run(
        db.skill_requests.insert_one(
            {
                "id": "legacy-1",
                "provider_id": "someone",
                "provider_name": "Old",
                "category_name": "Plumber",
                "proof_url": "/uploads/skill_proof_old.png",
                "status": "PENDING",
            }
        )
    )

    response = client.get("/api/v1/skill-requests/legacy-1/proof", headers=bearer(admin_token))

    assert response.status_code == 200
    assert response.content == PNG


# ---------- public serving ----------


def test_public_mount_serves_only_images_with_nosniff(tmp_path: Path) -> None:
    (tmp_path / "ok.png").write_bytes(PNG)
    (tmp_path / "page.html").write_bytes(HTML)
    (tmp_path / "doc.pdf").write_bytes(PDF)
    (tmp_path / "vector.svg").write_bytes(b"<svg onload='alert(1)'/>")
    app = FastAPI()
    app.mount("/uploads", PublicUploadFiles(directory=tmp_path))
    http = TestClient(app)

    ok = http.get("/uploads/ok.png")

    assert ok.status_code == 200
    assert ok.headers["x-content-type-options"] == "nosniff"
    for name in ("page.html", "doc.pdf", "vector.svg", "missing.png"):
        assert http.get(f"/uploads/{name}").status_code == 404


# ---------- audit script and code guard ----------


def test_audit_lists_bad_files_and_changes_nothing(tmp_path: Path) -> None:
    (tmp_path / "public").mkdir()
    (tmp_path / "private").mkdir()
    (tmp_path / "public" / "good.png").write_bytes(PNG)
    (tmp_path / "public" / "x.html").write_bytes(HTML)
    (tmp_path / "public" / "fake.png").write_bytes(HTML)
    (tmp_path / "public" / "wrong.jpg").write_bytes(PNG)
    (tmp_path / "private" / "scan.pdf").write_bytes(PDF)
    (tmp_path / "old_proof.png").write_bytes(PNG)
    before = {p: p.read_bytes() for p in tmp_path.rglob("*") if p.is_file()}

    findings = {f["path"].replace("\\", "/") for f in audit(tmp_path)}

    assert findings == {"public/x.html", "public/fake.png", "public/wrong.jpg", "old_proof.png"}
    assert before == {p: p.read_bytes() for p in tmp_path.rglob("*") if p.is_file()}
    json.dumps(audit(tmp_path))  # --json output must serialise


def test_no_route_or_service_writes_files_directly() -> None:
    """All uploads must go through services/uploads.py and the storage adapter."""
    app_dir = Path(__file__).resolve().parents[1] / "app"
    raw_write = re.compile(r"""open\([^)]*["']wb["']|\.write_bytes\(""")
    offenders = [
        str(p.relative_to(app_dir))
        for p in app_dir.rglob("*.py")
        if p.name != "storage.py" and raw_write.search(p.read_text(encoding="utf-8"))
    ]
    assert offenders == []
