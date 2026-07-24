#!/usr/bin/env python3
"""Offline domain tests for guarded Roll Calendar v2 behavior."""

from __future__ import annotations

import tempfile
import unittest
from datetime import date, datetime
from pathlib import Path

import duckdb
import yaml

from v4.server import roll_calendar_service as service


def write_calendar(path: Path) -> None:
    path.write_text(
        "\n".join([
            "version: 2",
            "timezone: America/New_York",
            "dataset: GLBX.MDP3",
            "schema: ohlcv-1m",
            "rolls:",
            "  - instrument: ES",
            "    old_contract: ESH6",
            "    new_contract: ESM6",
            "    roll_date_et: 2026-03-13",
            "    effective_at_et: 2026-03-13T00:00",
            "    boundary_policy: legacy_midnight",
            "    status: validated",
            "    note: legacy",
            "  - instrument: ES",
            "    old_contract: ESM6",
            "    new_contract: ESU6",
            "    roll_date_et: 2026-06-15",
            "    effective_at_et: 2026-06-15T00:00",
            "    boundary_policy: legacy_midnight",
            "    status: manual_validated",
            "    note: legacy",
            "  - instrument: NQ",
            "    old_contract: NQH6",
            "    new_contract: NQM6",
            "    roll_date_et: 2026-03-16",
            "    effective_at_et: 2026-03-16T00:00",
            "    boundary_policy: legacy_midnight",
            "    status: volume_validated",
            "    note: legacy",
            "  - instrument: NQ",
            "    old_contract: NQM6",
            "    new_contract: NQU6",
            "    roll_date_et: 2026-06-15",
            "    effective_at_et: 2026-06-15T00:00",
            "    boundary_policy: legacy_midnight",
            "    status: manual_validated",
            "    note: legacy",
            "",
        ]),
        encoding="utf-8",
    )


def create_db(path: Path, rows: list[tuple[str, datetime]] | None = None) -> None:
    with duckdb.connect(str(path)) as conn:
        conn.execute("create table futures_1m(instrument varchar, ts timestamp)")
        for instrument, ts in rows or []:
            conn.execute("insert into futures_1m values (?, ?)", [instrument, ts])


class RollCalendarServiceTests(unittest.TestCase):
    def test_next_contract_and_expiry_week_deadline(self) -> None:
        self.assertEqual(service.next_contract("ESU6"), "ESZ6")
        self.assertEqual(service.next_contract("NQZ6"), "NQH7")
        self.assertEqual(
            service.decision_deadline_et("ESU6", reference_year=2026),
            datetime(2026, 9, 14),
        )

    def test_health_reports_missing_next_transition_instead_of_silent_success(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            calendar = Path(temp_dir) / "roll.yml"
            write_calendar(calendar)

            result = service.health_snapshot(calendar, now_et=datetime(2026, 7, 23, 12, 0))

            es = next(row for row in result["rollHealth"] if row["instrument"] == "ES")
            self.assertEqual(es["activeContract"], "ESU6")
            self.assertEqual(es["nextOldContract"], "ESU6")
            self.assertEqual(es["nextNewContract"], "ESZ6")
            self.assertEqual(es["decisionDeadlineEt"], "2026-09-14T00:00")
            self.assertEqual(es["state"], "ready")

    def test_horizon_blocks_after_missing_next_roll(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            calendar = Path(temp_dir) / "roll.yml"
            write_calendar(calendar)
            _, events = service.load_calendar(calendar)

            with self.assertRaisesRegex(ValueError, "ESU6->ESZ6"):
                service.assert_range_within_horizon(events, "ES", datetime(2026, 9, 14, 0, 1))

    def test_trade_date_uses_1800_new_york_boundary(self) -> None:
        self.assertEqual(service.trade_date_for_et(datetime(2026, 9, 10, 17, 59)), date(2026, 9, 10))
        self.assertEqual(service.trade_date_for_et(datetime(2026, 9, 10, 18, 0)), date(2026, 9, 11))
        self.assertEqual(service.session_open_for_trade_date("2026-09-11"), datetime(2026, 9, 10, 18, 0))

    def test_broken_quarter_chain_is_rejected(self) -> None:
        data = {"version": 2, "timezone": "America/New_York"}
        events = [service.RollEvent(
            "ES", "ESM6", "ESZ6", datetime(2026, 6, 14, 18),
            "volume_confirmed", "bad", "cme_trade_date_session_open",
        )]
        with self.assertRaisesRegex(ValueError, "non-consecutive"):
            service.validate_calendar(data, events)

    def test_preview_commit_backs_up_atomically_and_audits(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            calendar = root / "roll.yml"
            database = root / "bars.duckdb"
            backups = root / "backups"
            audit = root / "audit.jsonl"
            write_calendar(calendar)
            create_db(database, [("ES", datetime(2026, 7, 23, 12, 0))])
            scan = service.record_scan_evidence(
                calendar,
                instrument="ES",
                old_contract="ESU6",
                new_contract="ESZ6",
                candidate_trade_date="2026-09-11",
                scan_start="2026-09-04",
                scan_end="2026-09-16",
                output="complete trade-date evidence",
            )
            preview = service.create_roll_preview(
                calendar,
                database,
                scan_token=scan["token"],
                status="volume_confirmed",
                note="Two complete trade dates show new-contract dominance.",
            )

            result = service.commit_roll_preview(
                calendar,
                preview_token=preview["previewToken"],
                confirm_text="ROLL ESU6 ESZ6",
                backup_dir=backups,
                audit_path=audit,
            )

            self.assertEqual(result["ok"], True)
            self.assertTrue(Path(result["backup"]).exists())
            self.assertTrue(audit.exists())
            saved = yaml.safe_load(calendar.read_text(encoding="utf-8"))
            self.assertEqual(saved["version"], 2)
            self.assertEqual(saved["rolls"][-1]["new_contract"], "ESZ6")
            self.assertEqual(saved["rolls"][-1]["effective_at_et"], "2026-09-10T18:00")

    def test_preview_rejects_historical_boundary_and_stale_scan(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            calendar = root / "roll.yml"
            database = root / "bars.duckdb"
            write_calendar(calendar)
            create_db(database, [("NQ", datetime(2026, 7, 23, 12, 0))])
            historical = service.record_scan_evidence(
                calendar,
                instrument="NQ",
                old_contract="NQU6",
                new_contract="NQZ6",
                candidate_trade_date="2026-07-23",
                scan_start="2026-07-15",
                scan_end="2026-07-24",
                output="manual fixture",
            )
            with self.assertRaisesRegex(ValueError, "historical roll repair required"):
                service.create_roll_preview(
                    calendar, database, scan_token=historical["token"],
                    status="manual_confirmed", note="Manual evidence.",
                )

            future = service.record_scan_evidence(
                calendar,
                instrument="NQ",
                old_contract="NQU6",
                new_contract="NQZ6",
                candidate_trade_date="2026-09-11",
                scan_start="2026-09-04",
                scan_end="2026-09-16",
                output="manual fixture",
            )
            calendar.write_text(calendar.read_text(encoding="utf-8") + "\n# changed\n", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "changed after the scan"):
                service.create_roll_preview(
                    calendar, database, scan_token=future["token"],
                    status="manual_confirmed", note="Manual evidence.",
                )


if __name__ == "__main__":
    unittest.main(verbosity=2)
