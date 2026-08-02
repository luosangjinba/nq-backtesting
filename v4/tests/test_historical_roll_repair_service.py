#!/usr/bin/env python3
"""Offline tests for the guarded NQ 2025 historical roll repair."""

from __future__ import annotations

import tempfile
import unittest
from datetime import datetime
from pathlib import Path
from unittest import mock

import duckdb
import pandas as pd

from v4.server import historical_roll_repair_service as service


def frame_for(spec: service.RepairSpec, rows: int, price: float) -> pd.DataFrame:
    timestamps = pd.date_range(spec.start_et, periods=rows, freq="min")
    return pd.DataFrame({
        "ts": timestamps,
        "open": price,
        "high": price + 2,
        "low": price - 2,
        "close": price + 1,
        "volume": range(1, rows + 1),
    })


def write_calendar(path: Path) -> str:
    text = "\n".join([
        "version: 2",
        "timezone: America/New_York",
        "dataset: GLBX.MDP3",
        "schema: ohlcv-1m",
        "rolls:",
        "  - instrument: NQ",
        "    old_contract: NQZ5",
        "    new_contract: NQH6",
        "    roll_date_et: 2025-12-15",
        "    effective_at_et: 2025-12-15T00:00",
        "    boundary_policy: legacy_midnight",
        "    status: volume_validated",
        "    note: old boundary",
        "  - instrument: NQ",
        "    old_contract: NQH6",
        "    new_contract: NQM6",
        "    roll_date_et: 2026-03-16",
        "    effective_at_et: 2026-03-16T00:00",
        "    boundary_policy: legacy_midnight",
        "    status: volume_validated",
        "    note: future",
        "  - instrument: NQ",
        "    old_contract: NQM6",
        "    new_contract: NQU6",
        "    roll_date_et: 2026-06-15",
        "    effective_at_et: 2026-06-15T00:00",
        "    boundary_policy: legacy_midnight",
        "    status: manual_validated",
        "    note: future",
        "",
    ])
    path.write_text(text, encoding="utf-8")
    return text


def create_database(path: Path) -> None:
    with duckdb.connect(str(path)) as conn:
        conn.execute("""
create table futures_1m (
    instrument varchar,
    ts timestamp,
    open double,
    high double,
    low double,
    close double,
    volume bigint
)
""")
        for index, spec in enumerate(service.REPAIR_SPECS):
            frame = frame_for(spec, spec.expected_current_rows, 100 + index * 10)
            frame.insert(0, "instrument", "NQ")
            conn.register("fixture_rows", frame)
            conn.execute("insert into futures_1m select * from fixture_rows")
            conn.unregister("fixture_rows")
        conn.execute("insert into futures_1m values ('ES', '2025-01-01', 1, 2, 0, 1, 1)")


def replacements() -> dict[str, pd.DataFrame]:
    return {
        spec.repair_id: frame_for(spec, spec.expected_replacement_rows, 200 + index * 10)
        for index, spec in enumerate(service.REPAIR_SPECS)
    }


def available_conditions() -> dict[str, list[dict[str, str]]]:
    return {
        spec.repair_id: [{"date": spec.start_et[:10], "condition": "available"}]
        for spec in service.REPAIR_SPECS
    }


class HistoricalRollRepairServiceTests(unittest.TestCase):
    def test_preview_and_commit_replace_only_audited_intervals(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            database = root / "market.duckdb"
            calendar = root / "roll.yml"
            create_database(database)
            write_calendar(calendar)

            preview = service.create_preview(
                database,
                calendar,
                replacements(),
                available_conditions(),
                repair_root=root / "repair",
                now=datetime.now(service.ET),
            )

            self.assertEqual(preview["expectedConfirmation"], "REPAIR NQ 2025")
            self.assertIn("net_restored_minutes: 138", preview["output"])
            result = service.commit_preview(
                preview["previewToken"],
                "REPAIR NQ 2025",
                repair_root=root / "repair",
                backup_dir=root / "backups",
                audit_path=root / "audit.jsonl",
            )

            self.assertTrue(Path(result["databaseBackup"]).is_file())
            self.assertTrue(Path(result["calendarBackup"]).is_file())
            self.assertTrue((root / "audit.jsonl").is_file())
            self.assertEqual(result["verification"]["nqDuplicates"], 0)
            self.assertEqual(
                result["verification"]["intervalRows"],
                {spec.repair_id: spec.expected_replacement_rows for spec in service.REPAIR_SPECS},
            )
            calendar_text = calendar.read_text(encoding="utf-8")
            self.assertIn("effective_at_et: 2025-03-16T18:00", calendar_text)
            self.assertIn("effective_at_et: 2025-09-14T18:00", calendar_text)
            self.assertNotIn("effective_at_et: 2025-12-15T00:00", calendar_text)
            with duckdb.connect(str(database), read_only=True) as conn:
                nq_rows = conn.execute(
                    "select count(*) from futures_1m where instrument = 'NQ'"
                ).fetchone()[0]
            self.assertEqual(nq_rows, sum(spec.expected_replacement_rows for spec in service.REPAIR_SPECS))

    def test_preview_rejects_non_available_source_condition(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            database = root / "market.duckdb"
            calendar = root / "roll.yml"
            create_database(database)
            write_calendar(calendar)
            conditions = available_conditions()
            conditions[service.REPAIR_SPECS[0].repair_id] = [
                {"date": "2025-03-14", "condition": "degraded"},
            ]

            with self.assertRaisesRegex(ValueError, "non-available Databento condition"):
                service.create_preview(
                    database,
                    calendar,
                    replacements(),
                    conditions,
                    repair_root=root / "repair",
                )

    def test_wrong_confirmation_cannot_mutate(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            database = root / "market.duckdb"
            calendar = root / "roll.yml"
            create_database(database)
            original_calendar = write_calendar(calendar)
            preview = service.create_preview(
                database,
                calendar,
                replacements(),
                available_conditions(),
                repair_root=root / "repair",
            )

            with self.assertRaisesRegex(ValueError, "REPAIR NQ 2025"):
                service.commit_preview(
                    preview["previewToken"],
                    "REPAIR NQ",
                    repair_root=root / "repair",
                )

            self.assertEqual(calendar.read_text(encoding="utf-8"), original_calendar)
            with duckdb.connect(str(database), read_only=True) as conn:
                nq_rows = conn.execute(
                    "select count(*) from futures_1m where instrument = 'NQ'"
                ).fetchone()[0]
            self.assertEqual(nq_rows, sum(spec.expected_current_rows for spec in service.REPAIR_SPECS))

    def test_audit_failure_restores_database_and_calendar(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            database = root / "market.duckdb"
            calendar = root / "roll.yml"
            create_database(database)
            original_calendar = write_calendar(calendar)
            preview = service.create_preview(
                database,
                calendar,
                replacements(),
                available_conditions(),
                repair_root=root / "repair",
            )

            with mock.patch.object(service, "_append_jsonl", side_effect=OSError("injected audit failure")):
                with self.assertRaisesRegex(OSError, "injected audit failure"):
                    service.commit_preview(
                        preview["previewToken"],
                        "REPAIR NQ 2025",
                        repair_root=root / "repair",
                        backup_dir=root / "backups",
                        audit_path=root / "audit.jsonl",
                    )

            self.assertEqual(calendar.read_text(encoding="utf-8"), original_calendar)
            self.assertFalse((root / "audit.jsonl").exists())
            with duckdb.connect(str(database), read_only=True) as conn:
                nq_rows = conn.execute(
                    "select count(*) from futures_1m where instrument = 'NQ'"
                ).fetchone()[0]
            self.assertEqual(nq_rows, sum(spec.expected_current_rows for spec in service.REPAIR_SPECS))

    def test_post_write_verification_failure_restores_all_authoritative_outputs(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            database = root / "market.duckdb"
            calendar = root / "roll.yml"
            create_database(database)
            original_calendar = write_calendar(calendar)
            preview = service.create_preview(
                database,
                calendar,
                replacements(),
                available_conditions(),
                repair_root=root / "repair",
            )
            manifest_path = Path(preview["manifest"])
            original_manifest = manifest_path.read_text(encoding="utf-8")

            with mock.patch.object(service, "verify_repair", side_effect=ValueError("injected verify failure")):
                with self.assertRaisesRegex(ValueError, "injected verify failure"):
                    service.commit_preview(
                        preview["previewToken"],
                        "REPAIR NQ 2025",
                        repair_root=root / "repair",
                        backup_dir=root / "backups",
                        audit_path=root / "audit.jsonl",
                    )

            self.assertEqual(calendar.read_text(encoding="utf-8"), original_calendar)
            self.assertEqual(manifest_path.read_text(encoding="utf-8"), original_manifest)
            self.assertFalse((root / "audit.jsonl").exists())
            with duckdb.connect(str(database), read_only=True) as conn:
                nq_rows = conn.execute(
                    "select count(*) from futures_1m where instrument = 'NQ'"
                ).fetchone()[0]
            self.assertEqual(nq_rows, sum(spec.expected_current_rows for spec in service.REPAIR_SPECS))


if __name__ == "__main__":
    unittest.main(verbosity=2)
