#!/usr/bin/env python3
"""Focused tests for Session calendar market-date availability."""

from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

import duckdb


V4_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(V4_ROOT))

from server.market_data_calendar_handler import handle_available_dates_request  # noqa: E402
from server.market_data_calendar_service import query_available_market_dates  # noqa: E402


def create_db(path: Path):
    with duckdb.connect(str(path)) as conn:
        conn.execute("create table futures_1m (instrument varchar, ts timestamp)")
        conn.executemany("insert into futures_1m values (?, ?)", [
            ("ES", "2026-07-20 09:30:00"),
            ("ES", "2026-07-22 07:00:00"),
            ("NQ", "2026-07-20 09:31:00"),
            ("NQ", "2026-07-21 12:00:00"),
            ("NQ", "2026-07-22 06:59:00"),
        ])


class MarketDataCalendarTests(unittest.TestCase):
    def test_dates_and_partial_edge_times_are_read_from_source_bars(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            db_path = Path(temp_dir) / "bars.duckdb"
            create_db(db_path)
            records = query_available_market_dates(
                db_path, "futures_1m", ["NQ", "ES"],
            )

        self.assertEqual(records, (
            {
                "instrument": "NQ",
                "dates": ("2026-07-20", "2026-07-21", "2026-07-22"),
                "firstTimestamp": "2026-07-20T09:31",
                "latestTimestamp": "2026-07-22T06:59",
            },
            {
                "instrument": "ES",
                "dates": ("2026-07-20", "2026-07-22"),
                "firstTimestamp": "2026-07-20T09:30",
                "latestTimestamp": "2026-07-22T07:00",
            },
        ))

    def test_http_adapter_accepts_repeated_instruments_and_rejects_empty_input(self):
        calls = []
        responses = []
        errors = []

        handle_available_dates_request(
            {"instrument": ["NQ", "ES"]},
            send_json=responses.append,
            send_error=lambda message, status=400: errors.append((message, status)),
            db_path="db.duckdb",
            table_name="futures_1m",
            query_available_dates=lambda db, table, instruments: calls.append(
                (db, table, instruments),
            ) or (),
        )
        self.assertEqual(calls, [("db.duckdb", "futures_1m", ["NQ", "ES"])])
        self.assertEqual(responses[0]["timeZone"], "America/New_York")
        self.assertEqual(errors, [])

        handle_available_dates_request(
            {},
            send_json=responses.append,
            send_error=lambda message, status=400: errors.append((message, status)),
            db_path="db.duckdb",
            table_name="futures_1m",
            query_available_dates=lambda *_: (),
        )
        self.assertEqual(errors[-1], ("Missing 'instrument' parameter", 400))

    def test_cache_invalidates_after_database_write(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            db_path = Path(temp_dir) / "bars.duckdb"
            create_db(db_path)
            initial = query_available_market_dates(db_path, "futures_1m", ["NQ"])
            with duckdb.connect(str(db_path)) as conn:
                conn.execute("insert into futures_1m values ('NQ', '2026-07-23 07:00:00')")
            refreshed = query_available_market_dates(db_path, "futures_1m", ["NQ"])

        self.assertEqual(initial[0]["latestTimestamp"], "2026-07-22T06:59")
        self.assertEqual(refreshed[0]["latestTimestamp"], "2026-07-23T07:00")
        self.assertEqual(refreshed[0]["dates"][-1], "2026-07-23")


if __name__ == "__main__":
    unittest.main()
