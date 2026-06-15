#!/usr/bin/env python3
"""Offline tests for Databento updater write guards."""

from __future__ import annotations

import argparse
import contextlib
import importlib.util
import io
import sys
import tempfile
import unittest
from datetime import date, datetime
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
UPDATER = REPO_ROOT / "v4" / "scripts" / "update_databento_1m.py"

spec = importlib.util.spec_from_file_location("update_databento_1m", UPDATER)
assert spec and spec.loader
updater = importlib.util.module_from_spec(spec)
sys.modules["update_databento_1m"] = updater
spec.loader.exec_module(updater)


def segment(status: str) -> object:
    return updater.Segment(
        instrument="ES",
        contract="ESM6",
        start_et=datetime(2026, 3, 13),
        end_et=datetime(2026, 3, 14),
        roll_status=status,
        roll_note=f"{status} note",
    )


def args(instrument: str = "ES", write: bool = True, confirm_write: bool = True) -> argparse.Namespace:
    return argparse.Namespace(instrument=instrument, write=write, confirm_write=confirm_write)


class DatabentoWriteGuardTests(unittest.TestCase):
    def test_load_roll_calendar_preserves_statuses_dates_and_notes(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            calendar = Path(temp_dir) / "roll.yml"
            calendar.write_text(
                "\n".join([
                    "version: 1",
                    "dataset: GLBX.MDP3",
                    "schema: ohlcv-1m",
                    "rolls:",
                    "  - instrument: NQ",
                    "    old_contract: NQH6",
                    "    new_contract: NQM6",
                    "    roll_date_et: 2026-03-16",
                    "    status: volume_validated",
                    "    note: 'Resolved: volume crossover confirmed.'",
                    "  - instrument: ES",
                    "    old_contract: ESM6",
                    "    new_contract: ESU6",
                    "    roll_date_et: 2026-06-14",
                    "    status: future_candidate",
                    "    note: blocked pending scan",
                    "",
                ]),
                encoding="utf-8",
            )

            dataset, schema, entries = updater.load_roll_calendar(calendar)

            self.assertEqual(dataset, "GLBX.MDP3")
            self.assertEqual(schema, "ohlcv-1m")
            self.assertEqual(entries[0].instrument, "NQ")
            self.assertEqual(entries[0].roll_date_et, date(2026, 3, 16))
            self.assertEqual(entries[0].status, "volume_validated")
            self.assertEqual(entries[0].note, "Resolved: volume crossover confirmed.")
            self.assertEqual(entries[1].status, "future_candidate")

    def test_build_segments_preserves_blocked_and_write_eligible_roll_statuses(self) -> None:
        entries = [
            updater.RollEntry(
                instrument="NQ",
                old_contract="NQZ5",
                new_contract="NQH6",
                roll_date_et=date(2025, 12, 14),
                status="inferred_no_db_overlap",
                note="inferred",
            ),
            updater.RollEntry(
                instrument="NQ",
                old_contract="NQH6",
                new_contract="NQM6",
                roll_date_et=date(2026, 3, 16),
                status="volume_validated",
                note="volume confirmed",
            ),
            updater.RollEntry(
                instrument="NQ",
                old_contract="NQM6",
                new_contract="NQU6",
                roll_date_et=date(2026, 6, 14),
                status="future_candidate",
                note="blocked",
            ),
        ]

        segments = updater.build_segments(
            "NQ",
            entries,
            datetime(2025, 11, 5),
            datetime(2026, 6, 15),
        )

        self.assertEqual(
            [(item.contract, item.roll_status) for item in segments],
            [
                ("NQZ5", "inferred_no_db_overlap"),
                ("NQH6", "inferred_no_db_overlap"),
                ("NQM6", "volume_validated"),
                ("NQU6", "future_candidate"),
            ],
        )

    def test_write_guard_allows_write_eligible_roll_statuses_for_es(self) -> None:
        for status in ["validated", "volume_validated", "manual_validated"]:
            with self.subTest(status=status):
                updater.validate_write_allowed(args(), [segment(status)])

    def test_write_guard_rejects_blocked_roll_statuses(self) -> None:
        blocked_statuses = ["future_candidate", "inferred_no_db_overlap", "inferred_volume_conflict", "unknown", ""]
        for status in blocked_statuses:
            with self.subTest(status=status):
                with self.assertRaises(SystemExit) as raised:
                    updater.validate_write_allowed(args(), [segment(status)])
                self.assertIn("write-eligible roll statuses", str(raised.exception))

    def test_write_guard_still_rejects_nq_write(self) -> None:
        with self.assertRaises(SystemExit) as raised:
            updater.validate_write_allowed(args(instrument="NQ"), [segment("volume_validated")])

        self.assertIn("currently allowed only for ES", str(raised.exception))

    def test_dry_run_skips_write_guard_status_rejection(self) -> None:
        updater.validate_write_allowed(args(write=False, confirm_write=False), [segment("future_candidate")])

    def test_roll_status_preflight_reports_blocked_segments(self) -> None:
        output = io.StringIO()
        with self.assertRaises(SystemExit) as raised:
            with contextlib.redirect_stdout(output):
                updater.print_roll_status_preflight(
                    args(write=False, confirm_write=False),
                    "GLBX.MDP3",
                    "ohlcv-1m",
                    [segment("future_candidate")],
                )

        self.assertEqual(raised.exception.code, 1)
        text = output.getvalue()
        self.assertIn("roll_status_preflight: ok", text)
        self.assertIn("status=future_candidate write_eligible=false WARNING blocked", text)
        self.assertIn("preflight_status: blocked", text)

    def test_roll_status_preflight_accepts_write_eligible_segments(self) -> None:
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            updater.print_roll_status_preflight(
                args(write=False, confirm_write=False),
                "GLBX.MDP3",
                "ohlcv-1m",
                [segment("volume_validated")],
            )

        text = output.getvalue()
        self.assertIn("status=volume_validated write_eligible=true", text)
        self.assertIn("preflight_status: write-eligible", text)


if __name__ == "__main__":
    unittest.main(verbosity=2)
