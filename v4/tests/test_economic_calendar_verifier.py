#!/usr/bin/env python3
"""Offline tests for economic calendar CSV verifier."""

from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
VERIFIER = REPO_ROOT / "v4" / "scripts" / "verify_economic_calendar.py"
HEADER = "event_date,event_time_et,event_time_utc,currency,title,impact,event_type,all_day,default_visible,actual,forecast,previous"


def run_verifier(path: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(VERIFIER), "--csv", str(path)],
        cwd=str(REPO_ROOT),
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )


class EconomicCalendarVerifierTests(unittest.TestCase):
    def test_valid_calendar_passes(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "economic.csv"
            path.write_text(
                "\n".join([
                    HEADER,
                    "2025-01-01,,,USD,Bank Holiday,Low,holiday,true,true,,,",
                    "2025-01-02,2025-01-02T08:30:00-05:00,2025-01-02T13:30:00Z,USD,Unemployment Claims,High,economic,false,true,211K,222K,220K",
                    "",
                ]),
                encoding="utf-8",
            )

            result = run_verifier(path)

            self.assertEqual(result.returncode, 0, result.stdout)
            self.assertIn("economic_calendar_verify_status: ok", result.stdout)
            self.assertIn("rows: 2", result.stdout)
            self.assertIn("date_max: 2025-01-02", result.stdout)

    def test_detects_duplicates_bad_timestamp_and_sort_order(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "economic.csv"
            path.write_text(
                "\n".join([
                    HEADER,
                    "2025-01-03,2025-01-03T10:00:00-05:00,2025-01-03T14:00:00Z,USD,ISM Manufacturing PMI,High,economic,false,true,49.3,,",
                    "2025-01-02,2025-01-02T08:30:00-05:00,2025-01-02T13:30:00Z,USD,Unemployment Claims,Bad,economic,false,true,211K,,",
                    "2025-01-02,2025-01-02T08:30:00-05:00,2025-01-02T13:30:00Z,USD,Unemployment Claims,Bad,economic,false,true,211K,,",
                    "",
                ]),
                encoding="utf-8",
            )

            result = run_verifier(path)

            self.assertEqual(result.returncode, 1, result.stdout)
            self.assertIn("economic_calendar_verify_status: failed", result.stdout)
            self.assertIn("duplicate_keys: 1", result.stdout)
            self.assertIn("malformed_rows: 3", result.stdout)
            self.assertIn("rows are not sorted", result.stdout)


if __name__ == "__main__":
    unittest.main()
