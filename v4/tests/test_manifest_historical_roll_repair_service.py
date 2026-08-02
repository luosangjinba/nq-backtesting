#!/usr/bin/env python3
"""Offline tests for the reviewed-manifest historical roll repair boundary."""

from __future__ import annotations

import tempfile
import unittest
from datetime import datetime
from pathlib import Path
from unittest import mock

import duckdb
import pandas as pd
import yaml

from v4.server import manifest_historical_roll_repair_service as service


def frame(rows: int, price: float) -> pd.DataFrame:
    return pd.DataFrame({
        "ts": pd.date_range("2024-03-10 18:00:00", periods=rows, freq="min"),
        "open": price,
        "high": price + 2,
        "low": price - 2,
        "close": price + 1,
        "volume": range(1, rows + 1),
    })


def write_plan(path: Path, replacement: pd.DataFrame, *, current_rows: int = 3) -> service.RepairPlan:
    payload = {
        "version": 1,
        "plan_id": "nq-test-repair",
        "dataset": "GLBX.MDP3",
        "schema": "ohlcv-1m",
        "instrument": "NQ",
        "expected_confirmation": "REPAIR NQ TEST",
        "audit_document": "v7/docs/test.md",
        "expected_totals": {
            "current_rows": current_rows,
            "replacement_rows": len(replacement),
            "net_restored_minutes": len(replacement) - current_rows,
        },
        "repairs": [{
            "repair_id": "2024-03-h4-m4",
            "transition": "NQH4->NQM4",
            "source_contract": "NQM4",
            "start_et": "2024-03-10T18:00:00",
            "end_et": "2024-03-10T18:10:00",
            "expected_current_rows": current_rows,
            "expected_replacement_rows": len(replacement),
            "expected_replacement_fingerprint": service.frame_fingerprint(replacement),
        }],
        "calendar_events": [{
            "instrument": "NQ",
            "old_contract": "NQH4",
            "new_contract": "NQM4",
            "roll_date_et": "2024-03-11",
            "effective_at_et": "2024-03-10T18:00",
            "boundary_policy": "cme_trade_date_session_open",
            "status": "volume_confirmed",
            "evidence_type": "test",
            "note": "Reviewed fixture evidence.",
        }],
    }
    path.write_text(yaml.safe_dump(payload, sort_keys=False), encoding="utf-8")
    return service.load_plan(path)


def write_calendar(path: Path) -> str:
    text = "\n".join([
        "version: 2",
        "timezone: America/New_York",
        "dataset: GLBX.MDP3",
        "schema: ohlcv-1m",
        "rolls:",
        "  - instrument: NQ",
        "    old_contract: NQH4",
        "    new_contract: NQM4",
        "    roll_date_et: 2024-03-14",
        "    effective_at_et: 2024-03-14T00:00",
        "    boundary_policy: legacy_midnight",
        "    status: volume_validated",
        "    note: old boundary",
        "  - instrument: NQ",
        "    old_contract: NQM4",
        "    new_contract: NQU4",
        "    roll_date_et: 2024-06-17",
        "    effective_at_et: 2024-06-16T18:00",
        "    boundary_policy: cme_trade_date_session_open",
        "    status: volume_confirmed",
        "    note: future boundary",
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
        current = frame(3, 100)
        current.insert(0, "instrument", "NQ")
        conn.register("fixture_rows", current)
        conn.execute("insert into futures_1m select * from fixture_rows")
        conn.unregister("fixture_rows")
        conn.execute("insert into futures_1m values ('ES', '2024-01-01', 1, 2, 0, 1, 1)")


def conditions() -> dict[str, list[dict[str, str]]]:
    return {"2024-03-h4-m4": [{"date": "2024-03-10", "condition": "available"}]}


class ManifestHistoricalRollRepairTests(unittest.TestCase):
    def fixture(self, root: Path):
        database = root / "market.duckdb"
        calendar = root / "roll.yml"
        plan_path = root / "plan.yml"
        replacement = frame(4, 200)
        create_database(database)
        original_calendar = write_calendar(calendar)
        plan = write_plan(plan_path, replacement)
        return database, calendar, original_calendar, plan, replacement

    def test_preview_and_commit_are_manifest_bound(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            database, calendar, _, plan, replacement = self.fixture(root)
            preview = service.create_preview(
                plan,
                database,
                calendar,
                {plan.repairs[0].repair_id: replacement},
                conditions(),
                repair_root=root / "repair",
                now=datetime.now(service.ET),
            )
            self.assertEqual(preview["expectedConfirmation"], "REPAIR NQ TEST")
            self.assertIn("net_restored_minutes: 1", preview["output"])
            result = service.commit_preview(
                plan,
                preview["previewToken"],
                "REPAIR NQ TEST",
                repair_root=root / "repair",
                backup_dir=root / "backups",
                audit_path=root / "audit.jsonl",
            )
            self.assertTrue(Path(result["databaseBackup"]).is_file())
            self.assertTrue(Path(result["calendarBackup"]).is_file())
            self.assertEqual(result["verification"]["instrumentDuplicates"], 0)
            self.assertEqual(result["verification"]["intervalRows"], {"2024-03-h4-m4": 4})
            self.assertIn("effective_at_et: 2024-03-10T18:00", calendar.read_text(encoding="utf-8"))
            with duckdb.connect(str(database), read_only=True) as conn:
                self.assertEqual(conn.execute(
                    "select count(*) from futures_1m where instrument = 'NQ'"
                ).fetchone()[0], 4)

    def test_preview_rejects_fingerprint_drift(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            database, calendar, _, plan, replacement = self.fixture(root)
            drifted = replacement.copy()
            drifted.loc[0, "close"] += 1
            with self.assertRaisesRegex(ValueError, "reviewed manifest"):
                service.create_preview(
                    plan,
                    database,
                    calendar,
                    {plan.repairs[0].repair_id: drifted},
                    conditions(),
                    repair_root=root / "repair",
                )

    def test_wrong_confirmation_cannot_mutate(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            database, calendar, original_calendar, plan, replacement = self.fixture(root)
            preview = service.create_preview(
                plan,
                database,
                calendar,
                {plan.repairs[0].repair_id: replacement},
                conditions(),
                repair_root=root / "repair",
            )
            with self.assertRaisesRegex(ValueError, "REPAIR NQ TEST"):
                service.commit_preview(
                    plan,
                    preview["previewToken"],
                    "REPAIR NQ",
                    repair_root=root / "repair",
                )
            self.assertEqual(calendar.read_text(encoding="utf-8"), original_calendar)
            with duckdb.connect(str(database), read_only=True) as conn:
                self.assertEqual(conn.execute(
                    "select count(*) from futures_1m where instrument = 'NQ'"
                ).fetchone()[0], 3)

    def test_post_write_failure_restores_database_calendar_audit_and_manifest(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            database, calendar, original_calendar, plan, replacement = self.fixture(root)
            preview = service.create_preview(
                plan,
                database,
                calendar,
                {plan.repairs[0].repair_id: replacement},
                conditions(),
                repair_root=root / "repair",
            )
            manifest_path = Path(preview["manifest"])
            original_manifest = manifest_path.read_text(encoding="utf-8")
            with mock.patch.object(service, "verify_repair", side_effect=ValueError("injected verify failure")):
                with self.assertRaisesRegex(ValueError, "injected verify failure"):
                    service.commit_preview(
                        plan,
                        preview["previewToken"],
                        "REPAIR NQ TEST",
                        repair_root=root / "repair",
                        backup_dir=root / "backups",
                        audit_path=root / "audit.jsonl",
                    )
            self.assertEqual(calendar.read_text(encoding="utf-8"), original_calendar)
            self.assertEqual(manifest_path.read_text(encoding="utf-8"), original_manifest)
            self.assertFalse((root / "audit.jsonl").exists())
            with duckdb.connect(str(database), read_only=True) as conn:
                self.assertEqual(conn.execute(
                    "select count(*) from futures_1m where instrument = 'NQ'"
                ).fetchone()[0], 3)

    def test_plan_loader_rejects_totals_mismatch(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            plan_path = root / "plan.yml"
            replacement = frame(4, 200)
            write_plan(plan_path, replacement)
            payload = yaml.safe_load(plan_path.read_text(encoding="utf-8"))
            payload["expected_totals"]["replacement_rows"] = 5
            plan_path.write_text(yaml.safe_dump(payload, sort_keys=False), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "expected_totals"):
                service.load_plan(plan_path)


if __name__ == "__main__":
    unittest.main(verbosity=2)
