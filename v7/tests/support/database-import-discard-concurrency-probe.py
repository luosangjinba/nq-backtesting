#!/usr/bin/env python3
"""Hold real validation in progress and prove discard fails closed."""

from __future__ import annotations

import io
import json
import sys
import tempfile
import threading
import time
from pathlib import Path


SERVER_ROOT = Path(__file__).resolve().parents[2] / "server"
sys.path.insert(0, str(SERVER_ROOT))

import database_import_store as store_module  # noqa: E402
from database_import_validation import ImportRequestError  # noqa: E402


def main() -> None:
    fixture = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    test_case = next(case for case in fixture["cases"] if case["driver"] == "preparing-race")
    source = "\n".join([
        "instrument,ts,open,high,low,close,volume",
        "ES,2026-01-02 09:30:00,6000,6001,5999,6000.5,20",
        "NQ,2026-01-02 09:30:00,21000,21002,20999,21001,30",
    ]).encode("utf-8")
    entered_validation = threading.Event()
    release_validation = threading.Event()
    original_create = store_module.create_database_from_csv

    def blocked_create(source_path: Path, candidate_path: Path) -> None:
        entered_validation.set()
        if not release_validation.wait(5):
            raise RuntimeError("validation release timed out")
        original_create(source_path, candidate_path)

    with tempfile.TemporaryDirectory(prefix="v7-discard-race-") as temporary_root:
        root = Path(temporary_root)
        store_module.create_database_from_csv = blocked_create
        store = store_module.DatabaseImportStore(
            str(root / "market" / "trading_data.duckdb"),
            str(root / "staging"),
            import_enabled=True,
        )
        job = store.upload("reviewer", "market.csv", "text/csv", len(source), io.BytesIO(source))
        store.prepare("reviewer", job["uploadId"])
        if not entered_validation.wait(5):
            raise AssertionError("validation did not enter the controlled preparing state")
        try:
            store.discard("reviewer", job["uploadId"])
            raise AssertionError("discard unexpectedly accepted a preparing task")
        except ImportRequestError as error:
            observed = {"status": error.status, "failureCode": error.code}
        finally:
            release_validation.set()

        deadline = time.monotonic() + 5
        while store.status("reviewer", job["uploadId"])["state"] == "preparing":
            if time.monotonic() >= deadline:
                raise AssertionError("validation did not leave preparing after release")
            time.sleep(0.01)
        store_module.create_database_from_csv = original_create

    assert observed["status"] == test_case["expectedStatus"]
    assert observed["failureCode"] == test_case["expectedFailureCode"]
    print(json.dumps({"id": test_case["id"], **observed}, separators=(",", ":")))


if __name__ == "__main__":
    main()
