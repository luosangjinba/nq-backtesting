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


if __name__ == "__main__":
    unittest.main(verbosity=2)
