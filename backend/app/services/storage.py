from pathlib import Path
from typing import BinaryIO, Protocol

from app.core.config import get_settings


class FileStorageService(Protocol):
    def save(self, path: str, file_obj: BinaryIO) -> str:
        """Save a file and return its storage path."""

    def resolve(self, path: str) -> Path | None:
        """Return a local file path for `path`, or None if it does not exist."""


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

    def resolve(self, path: str) -> Path | None:
        base = self.base_dir.resolve()
        candidate = (base / path).resolve()
        if base not in candidate.parents or not candidate.is_file():
            return None
        return candidate


class S3FileStorageService:
    def save(self, path: str, file_obj: BinaryIO) -> str:
        raise NotImplementedError("S3 storage is a paid-ready adapter, not used in MVP.")

    def resolve(self, path: str) -> Path | None:
        raise NotImplementedError("S3 storage is a paid-ready adapter, not used in MVP.")


def get_storage() -> FileStorageService:
    """The single place the storage backend is chosen (R2 swap-in point, T1-13)."""
    return LocalFileStorageService()
