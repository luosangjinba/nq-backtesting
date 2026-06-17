#!/usr/bin/env python3
"""Focused regression tests for architecture-review fixes."""

from __future__ import annotations

import sys
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

import duckdb


REPO_ROOT = Path(__file__).resolve().parents[2]
V4_ROOT = REPO_ROOT / "v4"
sys.path.insert(0, str(V4_ROOT))

import v4_api  # noqa: E402
from server.price_lookup import query_price  # noqa: E402
from scripts.generate_daily_regime_csv import fetch_daily_rows  # noqa: E402


def chart_timestamp(value: str) -> int:
    return int(datetime.fromisoformat(value).replace(tzinfo=timezone.utc).timestamp())


def create_test_db(path: Path) -> None:
    with duckdb.connect(str(path)) as conn:
        conn.execute(
            """
            create table futures_1m (
              instrument varchar,
              ts timestamp,
              open double,
              high double,
              low double,
              close double,
              volume bigint
            )
            """
        )
        conn.executemany(
            "insert into futures_1m values (?, ?, ?, ?, ?, ?, ?)",
            [
                ("NQ", "2024-01-02 09:30:00", 100.0, 101.0, 99.0, 100.5, 10),
                ("ES", "2024-01-02 09:30:00", 5000.0, 5001.0, 4999.0, 5000.5, 20),
                ("ES", "2024-01-02 16:59:00", 5010.0, 5012.0, 5009.0, 5011.0, 30),
                ("ES", "2024-01-02 17:00:00", 9000.0, 9999.0, 1.0, 9001.0, 999),
                ("ES", "2024-01-02 17:59:00", 9100.0, 9998.0, 2.0, 9101.0, 999),
                ("ES", "2024-01-02 18:00:00", 5020.0, 5022.0, 5019.0, 5021.0, 40),
                ("ES", "2024-01-03 09:30:00", 5030.0, 5033.0, 5029.0, 5032.0, 50),
                ("ES", "2024-01-03 16:59:00", 5040.0, 5044.0, 5038.0, 5043.0, 60),
            ],
        )


class ArchitectureReviewFixTests(unittest.TestCase):
    def test_short_intraday_timeframes_have_explicit_backend_load_limits(self) -> None:
        self.assertEqual(v4_api._get_load_range_limit_days(2), 45)
        self.assertEqual(v4_api._get_load_range_limit_days(3), 45)
        self.assertEqual(v4_api._get_load_range_limit_days(4), 45)
        self.assertEqual(v4_api._get_load_range_limit_days(10), 180)
        self.assertEqual(v4_api._get_load_range_max_estimated_bars(10), 25959)

    def test_price_request_parser_and_lookup_respect_instrument_parameter(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            db_path = Path(temp_dir) / "test.duckdb"
            create_test_db(db_path)
            ts = chart_timestamp("2024-01-02 09:30:00")
            parsed_ts, parsed_instrument = v4_api._parse_price_request({
                "timestamp": [str(ts)],
                "instrument": ["ES"],
            })
            default_ts, default_instrument = v4_api._parse_price_request({
                "timestamp": [str(ts)],
            })
            nq = query_price(default_ts, str(db_path), "futures_1m", default_instrument)
            es = query_price(parsed_ts, str(db_path), "futures_1m", parsed_instrument)

        self.assertEqual(nq["instrument"], "NQ")
        self.assertEqual(nq["close"], 100.5)
        self.assertEqual(es["instrument"], "ES")
        self.assertEqual(es["close"], 5000.5)
        self.assertEqual(default_instrument, "NQ")

    def test_data_maintenance_rejects_missing_request_guard_header(self) -> None:
        self.assertFalse(v4_api._is_valid_maintenance_request({}))
        self.assertFalse(v4_api._is_valid_maintenance_request({
            "X-V4-Maintenance-Request": "wrong",
        }))
        self.assertTrue(v4_api._is_valid_maintenance_request({
            "X-V4-Maintenance-Request": "data-maintenance",
        }))

    def test_data_maintenance_origin_guard_allows_only_local_static_page_origins(self) -> None:
        self.assertTrue(v4_api._is_allowed_maintenance_origin({}))
        self.assertTrue(v4_api._is_allowed_maintenance_origin({
            "Origin": "http://127.0.0.1:8001",
        }))
        self.assertTrue(v4_api._is_allowed_maintenance_origin({
            "Origin": "http://localhost:8001",
        }))
        self.assertFalse(v4_api._is_allowed_maintenance_origin({
            "Origin": "http://evil.example",
        }))

    def test_data_maintenance_post_guard_requires_header_and_allowed_origin(self) -> None:
        self.assertFalse(v4_api._is_allowed_maintenance_post({
            "Origin": "http://127.0.0.1:8001",
        }))
        self.assertFalse(v4_api._is_allowed_maintenance_post({
            "Origin": "http://evil.example",
            "X-V4-Maintenance-Request": "data-maintenance",
        }))
        self.assertTrue(v4_api._is_allowed_maintenance_post({
            "Origin": "http://127.0.0.1:8001",
            "X-V4-Maintenance-Request": "data-maintenance",
        }))
        self.assertTrue(v4_api._is_allowed_maintenance_post({
            "X-V4-Maintenance-Request": "data-maintenance",
        }))

    def test_data_maintenance_cors_origin_only_echoes_allowed_origins(self) -> None:
        self.assertEqual(v4_api._get_allowed_cors_origin({
            "Origin": "http://127.0.0.1:8001",
        }), "http://127.0.0.1:8001")
        self.assertEqual(v4_api._get_allowed_cors_origin({
            "Origin": "http://localhost:8001",
        }), "http://localhost:8001")
        self.assertEqual(v4_api._get_allowed_cors_origin({
            "Origin": "http://evil.example",
        }), "")
        self.assertEqual(v4_api._get_allowed_cors_origin({}), "")

    def test_daily_regime_and_api_daily_aggregation_exclude_maintenance_hour(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            db_path = Path(temp_dir) / "test.duckdb"
            create_test_db(db_path)
            api_rows = v4_api.query_v4_bars(
                str(db_path),
                "futures_1m",
                "ES",
                "2024-01-02 00:00",
                "2024-01-04 00:00",
                1440,
                padding=0,
            )
            regime_rows = fetch_daily_rows(db_path, "ES")

        api_by_day = {row["tradingDay"]: row for row in api_rows}
        regime_by_day = {row.date: row for row in regime_rows}
        self.assertIn("2024-01-03", api_by_day)
        self.assertIn("2024-01-03", regime_by_day)
        self.assertEqual(api_by_day["2024-01-03"]["high"], 5044.0)
        self.assertEqual(api_by_day["2024-01-03"]["low"], 5019.0)
        self.assertEqual(api_by_day["2024-01-03"]["close"], 5043.0)
        self.assertEqual(regime_by_day["2024-01-03"].high, 5044.0)
        self.assertEqual(regime_by_day["2024-01-03"].low, 5019.0)
        self.assertEqual(regime_by_day["2024-01-03"].close, 5043.0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
