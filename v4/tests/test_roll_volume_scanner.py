#!/usr/bin/env python3
"""Offline tests for roll volume candidate scanner."""

from __future__ import annotations

import importlib.util
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import yaml
import pandas as pd


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
    def test_trade_date_bucketing_and_incomplete_sessions_are_not_candidates(self) -> None:
        spec = importlib.util.spec_from_file_location("roll_scanner_domain", SCANNER)
        module = importlib.util.module_from_spec(spec)
        sys.modules["roll_scanner_domain"] = module
        spec.loader.exec_module(module)
        rows = pd.DataFrame([
            {"source_symbol": "ESU6", "ts": "2026-09-10 18:00", "volume": 10},
            {"source_symbol": "ESZ6", "ts": "2026-09-10 18:00", "volume": 20},
            {"source_symbol": "ESU6", "ts": "2026-09-11 09:30", "volume": 10},
            {"source_symbol": "ESZ6", "ts": "2026-09-11 09:30", "volume": 20},
        ])

        daily = module.aggregate_daily_volume(rows, "ESU6", "ESZ6", min_session_minutes=3)

        self.assertEqual(len(daily), 1)
        self.assertEqual(daily[0].date, "2026-09-11")
        self.assertEqual(daily[0].old_volume, 20)
        self.assertEqual(daily[0].new_volume, 40)
        self.assertEqual(daily[0].complete, False)
        self.assertIsNone(module.first_new_overtake(daily))

        boundary_rows = pd.DataFrame([
            {"source_symbol": symbol, "ts": ts, "volume": volume}
            for symbol, volume in [("ESU6", 10), ("ESZ6", 20)]
            for ts in ["2026-09-10 18:00", "2026-09-11 12:00", "2026-09-11 16:59"]
        ])
        complete = module.aggregate_daily_volume(
            boundary_rows, "ESU6", "ESZ6", min_session_minutes=3,
        )
        self.assertEqual(complete[0].complete, True)
        self.assertEqual(module.first_new_overtake(complete), "2026-09-11")

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

    def test_non_available_dataset_day_cannot_confirm_candidate(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            fixture = Path(temp_dir) / "nq-degraded-roll.csv"
            fixture.write_text(
                "\n".join([
                    "symbol,ts,volume,dataset_condition",
                    "NQU5,2025-09-16 09:30:00,100,available",
                    "NQZ5,2025-09-16 09:30:00,300,available",
                    "NQU5,2025-09-17 09:30:00,100,degraded",
                    "NQZ5,2025-09-17 09:30:00,400,degraded",
                    "NQU5,2025-09-18 09:30:00,100,available",
                    "NQZ5,2025-09-18 09:30:00,500,available",
                    "",
                ]),
                encoding="utf-8",
            )

            result = run_scanner([
                "--instrument", "NQ",
                "--old-contract", "NQU5",
                "--new-contract", "NQZ5",
                "--start", "2025-09-16",
                "--end", "2025-09-19",
                "--source-file", fixture,
                "--min-consecutive-days", "2",
            ])

            self.assertEqual(result.returncode, 0, result.stdout)
            self.assertIn("2025-09-17 NQU5 100 NQZ5 400 new 4.0000 1 1 false degraded", result.stdout)
            self.assertIn("non_available_trade_dates: 2025-09-17", result.stdout)
            self.assertIn("candidate_roll_date: n/a", result.stdout)

    def test_single_overtake_does_not_bypass_two_day_candidate_rule(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            fixture = Path(temp_dir) / "es-single-overtake.csv"
            fixture.write_text(
                "\n".join([
                    "symbol,ts,volume",
                    "ESU6,2026-09-11 09:30:00,900",
                    "ESZ6,2026-09-11 09:30:00,1200",
                    "",
                ]),
                encoding="utf-8",
            )

            result = run_scanner([
                "--instrument", "ES",
                "--old-contract", "ESU6",
                "--new-contract", "ESZ6",
                "--start", "2026-09-11",
                "--end", "2026-09-12",
                "--source-file", fixture,
                "--min-consecutive-days", "2",
            ])

            self.assertEqual(result.returncode, 0, result.stdout)
            self.assertIn("first_new_overtake_date: 2026-09-11", result.stdout)
            self.assertIn("first_consecutive_new_dominance_date: n/a", result.stdout)
            self.assertIn("candidate_roll_date: n/a", result.stdout)
            self.assertIn(
                "candidate_status: minimum consecutive new-contract dominance not met",
                result.stdout,
            )

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

    def test_confirm_roll_preview_does_not_write_calendar(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            calendar = Path(temp_dir) / "roll.yml"
            original = "\n".join([
                "version: 1",
                "timezone: America/New_York",
                "dataset: GLBX.MDP3",
                "schema: ohlcv-1m",
                "rolls:",
                "  - instrument: NQ",
                "    old_contract: NQH6",
                "    new_contract: NQM6",
                "    roll_date_et: 2026-03-13",
                "    status: inferred_volume_conflict",
                "    note: conflict",
                "",
            ])
            calendar.write_text(original, encoding="utf-8")

            result = run_scanner([
                "--confirm-roll",
                "--roll-calendar",
                calendar,
                "--instrument",
                "NQ",
                "--old-contract",
                "NQH6",
                "--new-contract",
                "NQM6",
                "--confirmed-roll-date",
                "2026-03-16",
                "--confirmed-status",
                "manual_validated",
                "--confirmed-note",
                "Confirmed against actual trading roll date.",
            ])

            self.assertEqual(result.returncode, 0, result.stdout)
            self.assertIn("roll_confirmation_status: ok", result.stdout)
            self.assertIn("write_status: preview-only", result.stdout)
            self.assertIn("-    roll_date_et: 2026-03-13", result.stdout)
            self.assertIn("+    roll_date_et: 2026-03-16", result.stdout)
            self.assertEqual(calendar.read_text(encoding="utf-8"), original)

    def test_legacy_confirm_roll_write_is_disabled_without_confirmation(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            calendar = Path(temp_dir) / "roll.yml"
            calendar.write_text(
                "\n".join([
                    "version: 1",
                    "rolls:",
                    "  - instrument: ES",
                    "    old_contract: ESM6",
                    "    new_contract: ESU6",
                    "    roll_date_et: 2026-06-14",
                    "    status: future_candidate",
                    "    note: pending",
                    "",
                ]),
                encoding="utf-8",
            )

            result = run_scanner([
                "--confirm-roll",
                "--roll-calendar",
                calendar,
                "--instrument",
                "ES",
                "--old-contract",
                "ESM6",
                "--new-contract",
                "ESU6",
                "--confirmed-roll-date",
                "2026-06-15",
                "--confirmed-status",
                "volume_validated",
                "--confirmed-note",
                "Volume scan confirmed.",
                "--write",
            ])

            self.assertEqual(result.returncode, 1, result.stdout)
            self.assertIn("roll_confirmation_status: failed", result.stdout)
            self.assertIn("legacy roll-calendar writes are disabled", result.stdout)

    def test_legacy_confirm_roll_write_is_disabled_even_with_confirmation(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            calendar = Path(temp_dir) / "roll.yml"
            calendar.write_text(
                "\n".join([
                    "version: 1",
                    "timezone: America/New_York",
                    "dataset: GLBX.MDP3",
                    "schema: ohlcv-1m",
                    "rolls:",
                    "  - instrument: ES",
                    "    old_contract: ESM6",
                    "    new_contract: ESU6",
                    "    roll_date_et: 2026-06-14",
                    "    status: future_candidate",
                    "    note: pending",
                    "",
                ]),
                encoding="utf-8",
            )

            result = run_scanner([
                "--confirm-roll",
                "--roll-calendar",
                calendar,
                "--instrument",
                "ES",
                "--old-contract",
                "ESM6",
                "--new-contract",
                "ESU6",
                "--confirmed-roll-date",
                "2026-06-15",
                "--confirmed-status",
                "volume_validated",
                "--confirmed-note",
                "Volume scan confirmed.",
                "--write",
                "--confirm-write",
            ])

            self.assertEqual(result.returncode, 1, result.stdout)
            self.assertIn("legacy roll-calendar writes are disabled", result.stdout)
            written = calendar.read_text(encoding="utf-8")
            self.assertIn("roll_date_et: 2026-06-14", written)
            self.assertIn("status: future_candidate", written)
            self.assertIn("note: pending", written)

    def test_confirm_roll_quotes_yaml_note_when_needed(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            calendar = Path(temp_dir) / "roll.yml"
            calendar.write_text(
                "\n".join([
                    "version: 1",
                    "rolls:",
                    "  - instrument: NQ",
                    "    old_contract: NQH6",
                    "    new_contract: NQM6",
                    "    roll_date_et: 2026-03-13",
                    "    status: inferred_volume_conflict",
                    "    note: pending",
                    "",
                ]),
                encoding="utf-8",
            )

            result = run_scanner([
                "--confirm-roll",
                "--roll-calendar",
                calendar,
                "--instrument",
                "NQ",
                "--old-contract",
                "NQH6",
                "--new-contract",
                "NQM6",
                "--confirmed-roll-date",
                "2026-03-16",
                "--confirmed-status",
                "volume_validated",
                "--confirmed-note",
                "Resolved: volume crossover confirmed.",
            ])

            self.assertEqual(result.returncode, 0, result.stdout)
            self.assertIn("note: 'Resolved: volume crossover confirmed.'", result.stdout)
            parsed = yaml.safe_load(calendar.read_text(encoding="utf-8"))
            self.assertEqual(parsed["rolls"][0]["note"], "pending")


if __name__ == "__main__":
    unittest.main(verbosity=2)
