"""Export the FastAPI OpenAPI schema to .coordination/contracts/openapi.json.

Run from backend/:  python -m scripts.export_openapi
Does not need a running server or database.
"""

import json
from pathlib import Path

from app.main import app

OUTPUT_PATH = Path(__file__).resolve().parents[2] / ".coordination" / "contracts" / "openapi.json"


def main() -> None:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    schema = json.dumps(app.openapi(), indent=2, sort_keys=True, ensure_ascii=False)
    OUTPUT_PATH.write_text(schema + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
