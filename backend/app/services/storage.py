import mimetypes
from pathlib import Path
from typing import Any, BinaryIO, Protocol

from app.core.config import get_settings


class FileStorageService(Protocol):
    def save(self, path: str, file_obj: BinaryIO) -> str:
        """Save a file under `path` (for example `private/<uuid>.pdf`) and return its key."""

    def exists(self, path: str) -> bool:
        """True when a file is stored under `path`."""

    def resolve(self, path: str) -> Path | None:
        """A local file path for `path`, or None (always None for remote storage)."""

    def signed_url(
        self,
        path: str,
        expires_in: int,
        download_name: str | None = None,
        content_type: str | None = None,
    ) -> str | None:
        """A short-lived URL for the client to fetch directly, or None when served locally."""


class LocalFileStorageService:
    def __init__(self, base_dir: Path | None = None) -> None:
        settings = get_settings()
        self.base_dir = Path(base_dir or settings.local_upload_dir)

    def save(self, path: str, file_obj: BinaryIO) -> str:
        destination = self.base_dir / path
        destination.parent.mkdir(parents=True, exist_ok=True)

        with destination.open("wb") as output:
            output.write(file_obj.read())

        return str(destination)

    def exists(self, path: str) -> bool:
        return self.resolve(path) is not None

    def resolve(self, path: str) -> Path | None:
        base = self.base_dir.resolve()
        candidate = (base / path).resolve()
        if base not in candidate.parents or not candidate.is_file():
            return None
        return candidate

    def signed_url(
        self,
        path: str,
        expires_in: int,
        download_name: str | None = None,
        content_type: str | None = None,
    ) -> str | None:
        return None


class R2FileStorageService:
    """Cloudflare R2 (S3 API). Private files are served through short-lived signed URLs.

    Keys look like local paths: `public/<name>` and `private/<name>`. The bucket stays private;
    the API checks who may read a file and then redirects to a signed URL (T1-13).
    """

    def __init__(self, client: Any | None = None) -> None:
        settings = get_settings()
        self.bucket = settings.r2_bucket
        if client is None:
            import boto3
            from botocore.config import Config

            client = boto3.client(
                "s3",
                endpoint_url=settings.r2_endpoint,
                aws_access_key_id=settings.r2_access_key_id,
                aws_secret_access_key=settings.r2_secret_access_key,
                region_name="auto",
                config=Config(signature_version="s3v4", retries={"max_attempts": 3}),
            )
        self.client = client

    def save(self, path: str, file_obj: BinaryIO) -> str:
        content_type = mimetypes.guess_type(path)[0] or "application/octet-stream"
        self.client.put_object(
            Bucket=self.bucket,
            Key=path,
            Body=file_obj.read(),
            ContentType=content_type,
            CacheControl=(
                "private, max-age=0" if path.startswith("private/") else "public, max-age=86400"
            ),
        )
        return path

    def exists(self, path: str) -> bool:
        from botocore.exceptions import ClientError

        try:
            self.client.head_object(Bucket=self.bucket, Key=path)
        except ClientError as error:
            if error.response.get("Error", {}).get("Code") in ("404", "NoSuchKey", "NotFound"):
                return False
            raise
        return True

    def resolve(self, path: str) -> Path | None:
        return None

    def signed_url(
        self,
        path: str,
        expires_in: int,
        download_name: str | None = None,
        content_type: str | None = None,
    ) -> str | None:
        params: dict[str, Any] = {"Bucket": self.bucket, "Key": path}
        if download_name:
            params["ResponseContentDisposition"] = f'inline; filename="{download_name}"'
        if content_type:
            params["ResponseContentType"] = content_type
        return self.client.generate_presigned_url(
            "get_object", Params=params, ExpiresIn=expires_in
        )


def get_storage() -> FileStorageService:
    """The single place the storage backend is chosen (STORAGE_BACKEND=local|r2)."""
    if get_settings().storage_backend.strip().lower() == "r2":
        return R2FileStorageService()
    return LocalFileStorageService()
