#!/usr/bin/env python3
"""Offline tests for Databento updater write guards."""

from __future__ import annotations

import argparse
import importlib.util
import sys
import unittest
from datetime import datetime
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


if __name__ == "__main__":
    unittest.main(verbosity=2)
