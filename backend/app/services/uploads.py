"""One validator for every upload route (AR-005).

The real file type comes from the file's magic bytes. The client's content type and filename are
never trusted, and the stored name is always `<uuid>.<ext of the sniffed type>`.
"""

import uuid
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import Any, Literal

from fastapi import HTTPException
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import get_settings
from app.core.errors import AppErrorCode, app_http_error
from app.services.storage import get_storage

UploadKind = Literal["photo", "document"]
Area = Literal["public", "private"]

MEDIA_TYPES = {
    "jpg": "image/jpeg",
    "png": "image/png",
    "webp": "image/webp",
    "pdf": "application/pdf",
}
ALLOWED_EXTENSIONS: dict[str, set[str]] = {
    "photo": {"jpg", "png", "webp"},
    "document": {"jpg", "png", "webp", "pdf"},
}
LABELS = {"photo": "JPG, PNG or WEBP", "document": "JPG, PNG, WEBP or PDF"}
# Served from /uploads. Anything else in the public folder is hidden.
PUBLIC_SERVE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}


class PublicUploadFiles(StaticFiles):
    """Serves only image files, with `nosniff`, so a stray non-image can never run in a browser."""

    async def get_response(self, path: str, scope):  # type: ignore[no-untyped-def]
        if Path(path).suffix.lower() not in PUBLIC_SERVE_SUFFIXES:
            raise HTTPException(404)
        response = await super().get_response(path, scope)
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response


def sniff_extension(data: bytes) -> str | None:
    """Return 'jpg' / 'png' / 'webp' / 'pdf' from the first bytes, or None."""
    if data.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    if data.startswith(b"%PDF-"):
        return "pdf"
    return None


@dataclass
class StoredUpload:
    filename: str  # <uuid>.<ext>, relative to the area folder
    extension: str
    media_type: str


def _max_bytes(kind: UploadKind) -> int:
    settings = get_settings()
    if kind == "photo":
        return settings.upload_max_photo_bytes
    return settings.upload_max_document_bytes


async def validate_upload(upload: Any, kind: UploadKind) -> tuple[bytes, str]:
    """Read an UploadFile, enforce the size cap and the real type, return (bytes, extension)."""
    limit = _max_bytes(kind)
    data = await upload.read(limit + 1)
    if len(data) > limit:
        raise app_http_error(
            413,
            AppErrorCode.UPLOAD_TOO_LARGE,
            f"File is too large. The limit is {limit // (1024 * 1024)} MB.",
        )
    extension = sniff_extension(data)
    if extension is None or extension not in ALLOWED_EXTENSIONS[kind]:
        raise app_http_error(
            415,
            AppErrorCode.UPLOAD_TYPE_NOT_ALLOWED,
            f"File type not allowed. Please upload a {LABELS[kind]} file.",
        )
    return data, extension


async def store_upload(
    upload: Any, kind: UploadKind, area: Area, prefix: str = ""
) -> StoredUpload:
    data, extension = await validate_upload(upload, kind)
    filename = f"{prefix}{uuid.uuid4()}.{extension}"
    get_storage().save(f"{area}/{filename}", BytesIO(data))
    return StoredUpload(filename, extension, MEDIA_TYPES[extension])


def has_file(upload: Any) -> bool:
    """True when a form field actually carries a file (not '' or a missing field)."""
    return bool(upload) and bool(getattr(upload, "filename", None))


def private_file_response(
    filename: str, download_name: str, missing_message: str
) -> FileResponse:
    """Serve a stored private file (private/, or the uploads/ root for pre-AR-005 files).

    Local storage streams the file. Remote storage (R2) redirects to a short-lived signed URL,
    after the caller has already been authorised by the route.
    """
    storage = get_storage()
    key = next((k for k in (f"private/{filename}", filename) if storage.exists(k)), None)
    if key is None:
        raise HTTPException(404, missing_message)
    suffix = Path(key).suffix.lower()
    media_type = MEDIA_TYPES.get(suffix.lstrip("."), "application/octet-stream")
    headers = {"X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store"}

    signed = storage.signed_url(
        key,
        get_settings().signed_url_ttl_seconds,
        download_name=f"{download_name}{suffix}",
        content_type=media_type,
    )
    if signed:
        return RedirectResponse(signed, status_code=302, headers=headers)
    return FileResponse(
        storage.resolve(key),
        media_type=media_type,
        filename=f"{download_name}{suffix}",
        headers=headers,
    )


def public_upload_redirect(filename: str) -> RedirectResponse:
    """Remote storage: `/uploads/<name>` redirects to a signed URL for the public image."""
    if Path(filename).suffix.lower() not in PUBLIC_SERVE_SUFFIXES or "/" in filename:
        raise HTTPException(404)
    storage = get_storage()
    key = f"public/{filename}"
    if not storage.exists(key):
        raise HTTPException(404)
    signed = storage.signed_url(key, 3600)
    if not signed:
        raise HTTPException(404)
    headers = {"X-Content-Type-Options": "nosniff", "Cache-Control": "public, max-age=300"}
    return RedirectResponse(signed, status_code=302, headers=headers)
