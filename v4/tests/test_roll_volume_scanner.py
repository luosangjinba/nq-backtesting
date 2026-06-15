#!/usr/bin/env python3
"""Offline tests for roll volume candidate scanner."""

from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
SCANNER = REPO_ROOT / "v4" / "scripts" / "scan_roll_volume_candidates.py"


def run_scanner(args: list[object]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(SCANNER), *[str(arg) for arg in args]],
        cwd=str(REPO_ROOT),
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )


class RollVolumeScannerTests(unittest.TestCase):
    def test_detects_first_overtake_and_consecutive_candidate(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            fixture = Path(temp_dir) / "nq-roll.csv"
            fixture.write_text(
                "\n".join([
                    "symbol,ts,volume",
                    "NQH6,2026-03-13 09:30:00,1000",
                    "NQM6,2026-03-13 09:30:00,100",
                    "NQH6,2026-03-16 09:30:00,900",
                    "NQM6,2026-03-16 09:30:00,1200",
                    "NQH6,2026-03-17 09:30:00,800",
                    "NQM6,2026-03-17 09:30:00,1400",
                    "",
                ]),
                encoding="utf-8",
            )

            result = run_scanner([
                "--instrument",
                "NQ",
                "--old-contract",
                "NQH6",
                "--new-contract",
                "NQM6",
                "--start",
                "2026-03-13",
                "--end",
                "2026-03-18",
                "--source-file",
                fixture,
                "--min-consecutive-days",
                "2",
            ])

            self.assertEqual(result.returncode, 0, result.stdout)
            self.assertIn("scan_status: ok", result.stdout)
            self.assertIn("2026-03-13 NQH6 1000 NQM6 100 old 0.1000", result.stdout)
            self.assertIn("2026-03-16 NQH6 900 NQM6 1200 new 1.3333", result.stdout)
            self.assertIn("first_new_overtake_date: 2026-03-16", result.stdout)
            self.assertIn("first_consecutive_new_dominance_date: 2026-03-16", result.stdout)
            self.assertIn("candidate_roll_date: 2026-03-16", result.stdout)
            self.assertIn("candidate_status: manual confirmation required", result.stdout)

    def test_no_candidate_when_old_contract_stays_dominant(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            fixture = Path(temp_dir) / "es-roll.csv"
            fixture.write_text(
                "\n".join([
                    "symbol,ts,volume",
                    "ESM6,2026-06-12 09:30:00,2000",
                    "ESU6,2026-06-12 09:30:00,500",
                    "ESM6,2026-06-13 09:30:00,1800",
                    "ESU6,2026-06-13 09:30:00,700",
                    "",
                ]),
                encoding="utf-8",
            )

            result = run_scanner([
                "--instrument",
                "ES",
                "--old-contract",
                "ESM6",
                "--new-contract",
                "ESU6",
                "--start",
                "2026-06-12",
                "--end",
                "2026-06-14",
                "--source-file",
                fixture,
            ])

            self.assertEqual(result.returncode, 0, result.stdout)
            self.assertIn("first_new_overtake_date: n/a", result.stdout)
            self.assertIn("candidate_roll_date: n/a", result.stdout)
            self.assertIn("candidate_status: no new-contract dominance detected", result.stdout)

    def test_calendar_report_marks_blocked_entries_and_write_eligible_statuses(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            calendar = Path(temp_dir) / "roll.yml"
            calendar.write_text(
                "\n".join([
                    "version: 1",
                    "dataset: GLBX.MDP3",
                    "schema: ohlcv-1m",
                    "rolls:",
                    "  - instrument: ES",
                    "    old_contract: ESZ5",
                    "    new_contract: ESH6",
                    "    roll_date_et: 2025-12-14",
                    "    status: validated",
                    "    note: already checked",
                    "  - instrument: NQ",
                    "    old_contract: NQH6",
                    "    new_contract: NQM6",
                    "    roll_date_et: 2026-03-13",
                    "    status: inferred_volume_conflict",
                    "    note: conflict",
                    "  - instrument: ES",
                    "    old_contract: ESM6",
                    "    new_contract: ESU6",
                    "    roll_date_et: 2026-06-14",
                    "    status: future_candidate",
                    "    note: scan later",
                    "",
                ]),
                encoding="utf-8",
            )

            result = run_scanner(["--report-calendar", "--roll-calendar", calendar])

            self.assertEqual(result.returncode, 0, result.stdout)
            self.assertIn("roll_calendar_report_status: ok", result.stdout)
            self.assertIn("NQ NQH6 NQM6 2026-03-13 inferred_volume_conflict false true scan volume", result.stdout)
            self.assertIn("ES ESM6 ESU6 2026-06-14 future_candidate false true scan near roll window", result.stdout)
            self.assertIn("reported_entries: 2", result.stdout)
            self.assertIn("report_mode: read-only", result.stdout)

    def test_missing_scan_arguments_fail_readably(self) -> None:
        result = run_scanner([
            "--instrument",
            "NQ",
            "--old-contract",
            "NQH6",
        ])

        self.assertEqual(result.returncode, 1, result.stdout)
        self.assertIn("scan_status: failed", result.stdout)
        self.assertIn("missing required scan arguments", result.stdout)


if __name__ == "__main__":
    unittest.main(verbosity=2)
