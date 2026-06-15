from pathlib import Path
from typing import BinaryIO, Protocol

from app.core.config import get_settings


class FileStorageService(Protocol):
    def save(self, path: str, file_obj: BinaryIO) -> str:
        """Save a file and return its storage path."""


class LocalFileStorageService:
    def __init__(self, base_dir: Path | None = None) -> None:
        settings = get_settings()
        self.base_dir = base_dir or settings.local_upload_dir

    def save(self, path: str, file_obj: BinaryIO) -> str:
        destination = self.base_dir / path
        destination.parent.mkdir(parents=True, exist_ok=True)

        with destination.open("wb") as output:
            output.write(file_obj.read())

        return str(destination)


class S3FileStorageService:
    def save(self, path: str, file_obj: BinaryIO) -> str:
        raise NotImplementedError("S3 storage is a paid-ready adapter, not used in MVP.")
