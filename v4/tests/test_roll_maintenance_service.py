#!/usr/bin/env python3
"""Offline adapter tests for structured Roll Calendar maintenance actions."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from v4.server import roll_maintenance_service as adapter
from v4.tests.test_roll_calendar_service import write_calendar


class RollMaintenanceServiceTests(unittest.TestCase):
    def test_scan_derives_contracts_and_downloads_whole_trade_dates(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            calendar = root / "roll.yml"
            write_calendar(calendar)
            calls = []

            def run_command(args, timeout):
                calls.append((args, timeout))
                return {
                    "ok": True,
                    "returncode": 0,
                    "output": "scan_status: ok\ncomplete_trade_dates: 3\ncandidate_roll_date: 2026-09-11",
                }

            result = adapter.run_roll_action(
                "roll_scan_v2",
                {"instrument": "ES", "scanStart": "2026-09-04", "scanEnd": "2026-09-16"},
                calendar_path=calendar,
                db_path=root / "unused.duckdb",
                backup_dir=root / "backups",
                audit_path=root / "audit.jsonl",
                python="python-test",
                run_command=run_command,
            )

            command, timeout = calls[0]
            self.assertEqual(timeout, 1800)
            self.assertIn("ESU6", command)
            self.assertIn("ESZ6", command)
            self.assertIn("2026-09-03T18:00", command)
            self.assertIn("2026-09-16T18:00", command)
            self.assertEqual(result["rollScan"]["candidateTradeDate"], "2026-09-11")
            self.assertEqual(result["rollScan"]["effectiveAtEt"], "2026-09-10T18:00")

    def test_scan_rejects_inverted_trade_date_range(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            calendar = Path(temp_dir) / "roll.yml"
            write_calendar(calendar)
            with self.assertRaisesRegex(ValueError, "scanEnd"):
                adapter.run_roll_action(
                    "roll_scan_v2",
                    {"instrument": "NQ", "scanStart": "2026-09-17", "scanEnd": "2026-09-16"},
                    calendar_path=calendar,
                    db_path=Path(temp_dir) / "unused.duckdb",
                    backup_dir=Path(temp_dir) / "backups",
                    audit_path=Path(temp_dir) / "audit.jsonl",
                    python="python-test",
                    run_command=lambda *_args, **_kwargs: {},
                )


if __name__ == "__main__":
    unittest.main(verbosity=2)
