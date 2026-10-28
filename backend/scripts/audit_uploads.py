"""Read-only audit of the uploads folder (AR-005). Changes nothing.

Lists files whose extension is not allowed or whose real content (magic bytes) does not match the
extension, plus files in places they should not be. The human decides what to remove (Rule 11).

Run from backend/:
    python -m scripts.audit_uploads                # uses LOCAL_UPLOAD_DIR / ./uploads
    python -m scripts.audit_uploads --dir /path/to/uploads
    python -m scripts.audit_uploads --json
Exit code: 0 when everything is clean, 1 when findings exist, 2 when the folder is missing.
"""

import argparse
import json
import sys
from pathlib import Path

from app.core.config import get_settings
from app.services.uploads import ALLOWED_EXTENSIONS, PUBLIC_SERVE_SUFFIXES, sniff_extension

ALLOWED = ALLOWED_EXTENSIONS["document"]
EXT_ALIASES = {"jpeg": "jpg"}


def audit(root: Path) -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []
    for path in sorted(p for p in root.rglob("*") if p.is_file()):
        relative = path.relative_to(root)
        area = relative.parts[0] if len(relative.parts) > 1 else "root"
        extension = path.suffix.lower().lstrip(".")
        extension = EXT_ALIASES.get(extension, extension)
        with path.open("rb") as handle:
            sniffed = sniff_extension(handle.read(16))

        problems = []
        if sniffed is None:
            problems.append("content is not jpg/png/webp/pdf")
        elif sniffed not in ALLOWED:
            problems.append(f"content type {sniffed} not allowed")
        if extension not in ALLOWED:
            problems.append(f"extension .{extension or '(none)'} not allowed")
        elif sniffed and extension != sniffed:
            problems.append(f"extension .{extension} does not match content ({sniffed})")
        if area == "public" and path.suffix.lower() not in PUBLIC_SERVE_SUFFIXES:
            problems.append("public file that is not an image (no longer served)")
        if area == "root":
            problems.append("legacy file outside public/ and private/ (never served)")

        if problems:
            findings.append({"path": str(relative), "area": area, "problems": "; ".join(problems)})
    return findings


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--dir", type=Path, default=None)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    root = args.dir or Path(get_settings().local_upload_dir)
    if not root.is_dir():
        print(f"Upload folder not found: {root}", file=sys.stderr)
        return 2

    findings = audit(root)
    if args.json:
        print(json.dumps(findings, indent=2))
    elif not findings:
        print(f"OK: no problem files under {root}")
    else:
        print(f"{len(findings)} file(s) need review under {root} (nothing was changed):")
        for item in findings:
            print(f"  [{item['area']}] {item['path']}: {item['problems']}")
    return 1 if findings else 0


if __name__ == "__main__":
    raise SystemExit(main())
