#!/usr/bin/env python3
"""Focused tests for structured coverage and recoverable maintenance jobs."""

from __future__ import annotations

import sys
import tempfile
import threading
import time
import unittest
from datetime import datetime, timezone
from pathlib import Path

import duckdb


V4_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(V4_ROOT))

from server import maintenance_service  # noqa: E402
from server.market_data_backup_service import backup_market_data_database  # noqa: E402
from server.market_data_coverage_service import build_market_data_coverage  # noqa: E402


def create_db(path: Path):
    with duckdb.connect(str(path)) as conn:
        conn.execute("""
            create table futures_1m (
              instrument varchar, ts timestamp, open double, high double,
              low double, close double, volume bigint
            )
        """)
        conn.executemany(
            "insert into futures_1m values (?, ?, 1, 2, 0.5, 1.5, 10)",
            [
                ("ES", "2026-07-20 10:00:00"),
                ("ES", "2026-07-20 10:01:00"),
                ("NQ", "2026-07-20 10:00:00"),
            ],
        )


class MarketDataMaintenanceTests(unittest.TestCase):
    def test_coverage_is_structured_read_only_and_detects_duplicates(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            db_path = Path(temp_dir) / "bars.duckdb"
            create_db(db_path)
            clean = build_market_data_coverage(
                db_path,
                now=datetime(2026, 7, 20, 11, 0),
            )
            self.assertEqual([item["instrument"] for item in clean], ["ES", "NQ"])
            self.assertEqual(clean[0]["rows"], 2)
            self.assertEqual(clean[0]["latestTimestamp"], "2026-07-20 10:01")
            self.assertEqual(clean[0]["ageHours"], 1.0)
            self.assertEqual(clean[0]["integrity"], "ok")

            with duckdb.connect(str(db_path)) as conn:
                conn.execute("insert into futures_1m values ('NQ', '2026-07-20 10:00:00', 1, 2, .5, 1.5, 10)")
            dirty = build_market_data_coverage(db_path, now=datetime(2026, 7, 20, 11, 0))
            self.assertEqual(dirty[1]["duplicateTimestamps"], 1)
            self.assertEqual(dirty[1]["integrity"], "failed")

    def test_prewrite_backup_is_readable_and_reports_restore_smoke(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            db_path = Path(temp_dir) / "market.duckdb"
            backup_dir = Path(temp_dir) / "backups"
            create_db(db_path)
            result = backup_market_data_database(
                db_path,
                backup_dir=backup_dir,
                now=datetime(2026, 7, 23, 12, 0, tzinfo=timezone.utc),
            )
            self.assertTrue(result["ok"])
            self.assertIn("restore_smoke_status: ok", result["output"])
            backup_path = Path(result["backupPath"])
            self.assertTrue(backup_path.exists())
            with duckdb.connect(str(backup_path), read_only=True) as conn:
                self.assertEqual(conn.execute("select count(*) from futures_1m").fetchone()[0], 3)

    def test_background_job_returns_immediately_and_retains_terminal_result(self):
        release = threading.Event()

        def run_action(payload):
            release.wait(timeout=2)
            return {"ok": True, "returncode": 0, "output": f"finished {payload['action']}"}

        started = maintenance_service.run_data_maintenance_action_guarded(
            {"action": "job_start", "request": {"action": "dry_run", "instrument": "ES"}},
            run_action=run_action,
        )
        self.assertTrue(started["ok"])
        self.assertEqual(started["returncode"], 202)
        job_id = started["job"]["jobId"]

        running = maintenance_service.run_data_maintenance_action_guarded(
            {"action": "job_status", "jobId": job_id},
            run_action=run_action,
        )
        self.assertEqual(running["job"]["state"], "running")

        blocked = maintenance_service.run_data_maintenance_action_guarded(
            {"action": "verify"},
            run_action=run_action,
        )
        self.assertEqual(blocked["returncode"], 423)
        self.assertEqual(blocked["job"]["jobId"], job_id)

        release.set()
        deadline = time.monotonic() + 2
        terminal = running
        while terminal["job"]["state"] == "running" and time.monotonic() < deadline:
            time.sleep(0.01)
            terminal = maintenance_service.run_data_maintenance_action_guarded(
                {"action": "job_status", "jobId": job_id},
                run_action=run_action,
            )
        self.assertEqual(terminal["job"]["state"], "succeeded")
        self.assertEqual(terminal["job"]["result"]["output"], "finished dry_run")

    def test_background_job_allowlist_rejects_non_acquisition_action(self):
        with self.assertRaisesRegex(ValueError, "cannot run as a background job"):
            maintenance_service.run_data_maintenance_action_guarded(
                {"action": "job_start", "request": {"action": "economic_write"}},
                run_action=lambda payload: payload,
            )

    def test_background_failure_is_retained_and_releases_maintenance_lock(self):
        def fail_action(_payload):
            raise RuntimeError("provider unavailable")

        started = maintenance_service.run_data_maintenance_action_guarded(
            {"action": "job_start", "request": {"action": "dry_run", "instrument": "NQ"}},
            run_action=fail_action,
        )
        job_id = started["job"]["jobId"]
        deadline = time.monotonic() + 2
        terminal = started
        while terminal["job"]["state"] == "running" and time.monotonic() < deadline:
            time.sleep(0.01)
            terminal = maintenance_service.run_data_maintenance_action_guarded(
                {"action": "job_status", "jobId": job_id},
                run_action=fail_action,
            )
        self.assertEqual(terminal["job"]["state"], "failed")
        self.assertIn("provider unavailable", terminal["job"]["result"]["output"])

        followup = maintenance_service.run_data_maintenance_action_guarded(
            {"action": "verify"},
            run_action=lambda _payload: {"ok": True, "returncode": 0, "output": "ready"},
        )
        self.assertTrue(followup["ok"], "failed background work must release the maintenance lock")


if __name__ == "__main__":
    unittest.main()
