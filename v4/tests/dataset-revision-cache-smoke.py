#!/usr/bin/env python3
"""Prove DuckDB mutation changes provenance and invalidates V4 query caches."""

from __future__ import annotations

import pathlib
import sys
import tempfile
from datetime import datetime

import duckdb


REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]
V4_ROOT = REPO_ROOT / "v4"
sys.path.insert(0, str(V4_ROOT))

from server.bars_handler import handle_bars_request  # noqa: E402
from server.market_data_revision import (  # noqa: E402
    DatasetRevisionMismatch,
    resolve_dataset_revision,
)
from server import projected_history_service  # noqa: E402


def insert_bar(connection, timestamp, price):
    connection.execute(
        "insert into futures_1m values (?, ?, ?, ?, ?, ?, ?)",
        ["NQ", timestamp, price, price + 2, price - 2, price + 1, 10],
    )


with tempfile.TemporaryDirectory() as tmpdir:
    db_path = pathlib.Path(tmpdir) / "revision.duckdb"
    with duckdb.connect(str(db_path)) as connection:
        connection.execute(
            """
create table futures_1m (
  instrument text,
  ts timestamp,
  open double,
  high double,
  low double,
  close double,
  volume bigint
)
""".strip()
        )
        insert_bar(connection, datetime(2026, 5, 4, 9, 30), 100)

    first_revision = resolve_dataset_revision(str(db_path), "futures_1m")
    assert first_revision == resolve_dataset_revision(str(db_path), "futures_1m")
    projected_history_service.clear_projected_history_cache()
    first = projected_history_service.query_projected_history(
        str(db_path),
        "futures_1m",
        "NQ",
        "2026-05-04 09:00",
        "2026-05-04 11:00",
        "60",
        "rth",
        expected_dataset_revision=first_revision,
    )
    assert first["datasetRevision"] == first_revision
    assert first["cacheHit"] is False
    assert projected_history_service.query_projected_history(
        str(db_path),
        "futures_1m",
        "NQ",
        "2026-05-04 09:00",
        "2026-05-04 11:00",
        "60",
        "rth",
        expected_dataset_revision=first_revision,
    )["cacheHit"] is True

    with duckdb.connect(str(db_path)) as connection:
        insert_bar(connection, datetime(2026, 5, 4, 9, 31), 120)

    second_revision = resolve_dataset_revision(str(db_path), "futures_1m")
    assert second_revision != first_revision
    second = projected_history_service.query_projected_history(
        str(db_path),
        "futures_1m",
        "NQ",
        "2026-05-04 09:00",
        "2026-05-04 11:00",
        "60",
        "rth",
        expected_dataset_revision=second_revision,
    )
    assert second["datasetRevision"] == second_revision
    assert second["cacheHit"] is False
    assert second["bars"][0]["close"] != first["bars"][0]["close"]

    try:
        projected_history_service.query_projected_history(
            str(db_path),
            "futures_1m",
            "NQ",
            "2026-05-04 09:00",
            "2026-05-04 11:00",
            "60",
            "rth",
            expected_dataset_revision=first_revision,
        )
        raise AssertionError("a stale projected-history revision must be rejected")
    except DatasetRevisionMismatch:
        pass

    sent = []
    errors = []
    handle_bars_request(
        {
            "datasetRevision": [second_revision],
            "end": ["2026-05-04 11:00"],
            "instrument": ["NQ"],
            "start": ["2026-05-04 09:00"],
            "tf": ["1"],
        },
        db_path=str(db_path),
        query_bars=lambda *_args: [],
        resolve_dataset_revision=resolve_dataset_revision,
        send_error=lambda message, status=400: errors.append((status, message)),
        send_json=sent.append,
        table_name="futures_1m",
        validate_range=lambda *_args: {
            "start_dt": datetime(2026, 5, 4, 9, 0),
            "end_dt": datetime(2026, 5, 4, 11, 0),
        },
    )
    assert errors == []
    assert sent[0]["datasetRevision"] == second_revision

    handle_bars_request(
        {
            "datasetRevision": [first_revision],
            "end": ["2026-05-04 11:00"],
            "start": ["2026-05-04 09:00"],
        },
        db_path=str(db_path),
        query_bars=lambda *_args: (_ for _ in ()).throw(
            AssertionError("stale request queried DuckDB")
        ),
        resolve_dataset_revision=resolve_dataset_revision,
        send_error=lambda message, status=400: errors.append((status, message)),
        send_json=sent.append,
        table_name="futures_1m",
        validate_range=lambda *_args: {
            "start_dt": datetime(2026, 5, 4, 9, 0),
            "end_dt": datetime(2026, 5, 4, 11, 0),
        },
    )
    assert errors[-1][0] == 409

print("dataset revision cache smoke passed")
