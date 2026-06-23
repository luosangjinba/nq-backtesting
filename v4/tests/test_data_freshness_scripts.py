#!/usr/bin/env python3
"""Focused offline tests for V4 data freshness CLI scripts."""

from __future__ import annotations

import csv
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import duckdb


REPO_ROOT = Path(__file__).resolve().parents[2]
VIX_UPDATER = REPO_ROOT / "v4" / "scripts" / "update_vix_daily.py"
FRESHNESS_VERIFIER = REPO_ROOT / "v4" / "scripts" / "verify_data_freshness.py"
REFRESH_RUNNER = REPO_ROOT / "v4" / "scripts" / "daily_data_refresh.py"
SERVER_STATUS = REPO_ROOT / "v4" / "scripts" / "server_status.py"
BACKUP_V4_DATA = REPO_ROOT / "v4" / "scripts" / "backup_v4_data.py"


def run_cli(args: list[str], *, cwd: Path = REPO_ROOT) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, *[str(arg) for arg in args]],
        cwd=str(cwd),
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )


def write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def read_csv_dates(path: Path) -> list[str]:
    with path.open(newline="", encoding="utf-8") as handle:
        return [row["DATE"] for row in csv.DictReader(handle)]


def create_test_db(path: Path, *, duplicate_es: bool = False) -> None:
    with duckdb.connect(str(path)) as conn:
        conn.execute(
            """
create table futures_1m (
  instrument varchar,
  ts timestamp,
  open double,
  high double,
  low double,
  close double,
  volume bigint
)
""".strip()
        )
        rows = [
            ("ES", "2026-06-11 16:58:00", 1.0, 2.0, 0.5, 1.5, 10),
            ("ES", "2026-06-11 16:59:00", 1.5, 2.5, 1.0, 2.0, 11),
            ("NQ", "2025-11-04 18:39:00", 3.0, 4.0, 2.0, 3.5, 12),
        ]
        if duplicate_es:
            rows.append(("ES", "2026-06-11 16:59:00", 1.5, 2.5, 1.0, 2.0, 11))
        conn.executemany("insert into futures_1m values (?, ?, ?, ?, ?, ?, ?)", rows)


class DataFreshnessScriptTests(unittest.TestCase):
    def create_fixture_data_dir(self, temp: Path, db_path: Path) -> Path:
        data_dir = temp / "data"
        data_dir.mkdir()
        shutil_target = data_dir / "trading_data.duckdb"
        shutil_target.write_bytes(db_path.read_bytes())
        write_text(
            data_dir / "economic_calendar" / "economic_calendar_usd_events.csv",
            "event_date,currency,title,impact,event_type,all_day,default_visible\n2026-06-19,USD,Bank Holiday,Low,holiday,true,true\n",
        )
        write_text(data_dir / "vix-daily.csv", "DATE,OPEN,HIGH,LOW,CLOSE\n2026-06-12,1,2,0.5,1.5\n")
        write_text(data_dir / "vix-monthly.csv", "DATE,OPEN,HIGH,LOW,CLOSE\n2026-06-01,1,2,0.5,1.5\n")
        write_text(data_dir / "daily-regime-nq.csv", "date,trend_close\n2026-06-12,1\n")
        write_text(data_dir / "daily-regime-es.csv", "date,trend_close\n2026-06-12,1\n")
        return data_dir

    def test_vix_updater_dry_run_does_not_write_and_reports_merge(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp = Path(temp_dir)
            target = temp / "vix-daily.csv"
            source = temp / "cboe-vix.csv"
            write_text(
                target,
                "\n".join([
                    "DATE,OPEN,HIGH,LOW,CLOSE",
                    "2026-06-01,15.000000,16.000000,14.000000,15.500000",
                    "2026-06-03,17.000000,18.000000,16.000000,17.500000",
                    "",
                ]),
            )
            write_text(
                source,
                "\n".join([
                    "DATE,OPEN,HIGH,LOW,CLOSE",
                    "06/02/2026,16.000000,17.000000,15.000000,16.500000",
                    "06/03/2026,18.000000,19.000000,17.000000,18.500000",
                    "",
                ]),
            )

            result = run_cli([VIX_UPDATER, "--csv", target, "--source-file", source, "--show-sample", "2"])

            self.assertEqual(result.returncode, 0, result.stdout)
            self.assertIn("inserted_rows: 1", result.stdout)
            self.assertIn("updated_rows: 1", result.stdout)
            self.assertIn("write_status: dry-run; no CSV changes were made", result.stdout)
            self.assertEqual(read_csv_dates(target), ["2026-06-01", "2026-06-03"])

    def test_vix_updater_write_merges_dedupes_and_sorts(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp = Path(temp_dir)
            target = temp / "vix-daily.csv"
            source = temp / "cboe-vix.csv"
            write_text(
                target,
                "\n".join([
                    "DATE,OPEN,HIGH,LOW,CLOSE",
                    "2026-06-03,17.000000,18.000000,16.000000,17.500000",
                    "2026-06-01,15.000000,16.000000,14.000000,15.500000",
                    "",
                ]),
            )
            write_text(
                source,
                "\n".join([
                    "DATE,OPEN,HIGH,LOW,CLOSE",
                    "06/02/2026,16.000000,17.000000,15.000000,16.500000",
                    "06/03/2026,18.000000,19.000000,17.000000,18.500000",
                    "",
                ]),
            )

            result = run_cli([
                VIX_UPDATER,
                "--csv",
                target,
                "--source-file",
                source,
                "--write",
                "--confirm-write",
                "--show-sample",
                "0",
            ])

            self.assertEqual(result.returncode, 0, result.stdout)
            self.assertIn("write_status: committed VIX CSV update", result.stdout)
            self.assertEqual(read_csv_dates(target), ["2026-06-01", "2026-06-02", "2026-06-03"])
            self.assertIn("2026-06-03,18.000000,19.000000,17.000000,18.500000", target.read_text())

    def test_freshness_verifier_detects_malformed_vix_and_duplicate_db_timestamps(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp = Path(temp_dir)
            db_path = temp / "trading_data.duckdb"
            vix_path = temp / "bad-vix.csv"
            create_test_db(db_path, duplicate_es=True)
            write_text(
                vix_path,
                "\n".join([
                    "DATE,OPEN,HIGH,LOW,CLOSE",
                    "2026-06-01,15.000000,16.000000,14.000000,15.500000",
                    "2026-06-01,15.000000,16.000000,14.000000,15.500000",
                    "bad-date,15.000000,16.000000,14.000000,15.500000",
                    "",
                ]),
            )

            result = run_cli([
                FRESHNESS_VERIFIER,
                "--db",
                db_path,
                "--vix-csv",
                vix_path,
                "--instrument",
                "ES",
                "--warn-es-stale-hours",
                "999999",
                "--warn-vix-stale-days",
                "999999",
            ])

            self.assertEqual(result.returncode, 1, result.stdout)
            self.assertIn("duplicate_timestamps: 1", result.stdout)
            self.assertIn("duplicate_dates: 1", result.stdout)
            self.assertIn("malformed_rows: 1", result.stdout)
            self.assertIn("data_freshness_status: failed", result.stdout)

    def test_freshness_verifier_reports_current_nq_deferred_status(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp = Path(temp_dir)
            db_path = temp / "trading_data.duckdb"
            vix_path = temp / "vix-daily.csv"
            create_test_db(db_path)
            write_text(
                vix_path,
                "\n".join([
                    "DATE,OPEN,HIGH,LOW,CLOSE",
                    "2026-06-12,15.000000,16.000000,14.000000,15.500000",
                    "",
                ]),
            )

            result = run_cli([
                FRESHNESS_VERIFIER,
                "--db",
                db_path,
                "--vix-csv",
                vix_path,
                "--instrument",
                "NQ",
                "--warn-vix-stale-days",
                "999999",
            ])

            self.assertEqual(result.returncode, 0, result.stdout)
            self.assertIn(
                "write_status: deferred; NQ full refresh remains blocked until selected roll segments are write-eligible",
                result.stdout,
            )

    def test_refresh_runner_manual_local_path_and_write_guard(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp = Path(temp_dir)
            db_path = temp / "trading_data.duckdb"
            vix_path = temp / "vix-daily.csv"
            create_test_db(db_path)
            write_text(
                vix_path,
                "\n".join([
                    "DATE,OPEN,HIGH,LOW,CLOSE",
                    "2026-06-01,15.000000,16.000000,14.000000,15.500000",
                    "",
                ]),
            )

            guard = run_cli([
                REFRESH_RUNNER,
                "--write-vix",
                "--skip-es",
                "--vix-source-file",
                vix_path,
            ])
            self.assertEqual(guard.returncode, 2, guard.stdout)
            self.assertIn("--write-es/--write-vix require --confirm-write", guard.stdout)

            result = run_cli([
                REFRESH_RUNNER,
                "--manual",
                "--skip-es",
                "--vix-source-file",
                vix_path,
                "--vix-csv",
                vix_path,
                "--db",
                db_path,
                "--show-sample",
                "0",
                "--warn-es-stale-hours",
                "999999",
                "--warn-vix-stale-days",
                "999999",
            ])
            self.assertEqual(result.returncode, 0, result.stdout)
            self.assertIn("mode: manual", result.stdout)
            self.assertIn("== ES Databento refresh ==\nstage_status: skipped", result.stdout)
            self.assertIn("data_refresh_status: ok", result.stdout)

    def test_server_status_offline_fixture_reports_ok(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp = Path(temp_dir)
            db_path = temp / "trading_data.duckdb"
            create_test_db(db_path)
            data_dir = self.create_fixture_data_dir(temp, db_path)

            result = run_cli([
                SERVER_STATUS,
                "--skip-http",
                "--db",
                db_path,
                "--data-dir",
                data_dir,
            ])

            self.assertEqual(result.returncode, 0, result.stdout)
            self.assertIn("server_status: ok", result.stdout)
            self.assertIn("db_es_status: ok", result.stdout)
            self.assertIn("db_nq_status: ok", result.stdout)
            self.assertIn("file_status: vix-daily.csv ok", result.stdout)

    def test_backup_v4_data_creates_backup_and_restore_smoke(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp = Path(temp_dir)
            db_path = temp / "trading_data.duckdb"
            backup_dir = temp / "backups"
            create_test_db(db_path)
            data_dir = self.create_fixture_data_dir(temp, db_path)

            result = run_cli([
                BACKUP_V4_DATA,
                "--db",
                db_path,
                "--data-dir",
                data_dir,
                "--backup-dir",
                backup_dir,
                "--label",
                "test",
                "--restore-smoke",
            ])

            self.assertEqual(result.returncode, 0, result.stdout)
            self.assertIn("backup_status: ok", result.stdout)
            self.assertIn("restore_smoke_status: ok", result.stdout)
            self.assertTrue(list(backup_dir.glob("trading_data.*-test.duckdb")))
            self.assertTrue(list(backup_dir.glob("v4-data.*-test.tar.gz")))

    def test_refresh_runner_auto_state_and_lock(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp = Path(temp_dir)
            state = temp / "state.json"
            lock = temp / "refresh.lock"

            first = run_cli([
                REFRESH_RUNNER,
                "--auto",
                "--skip-es",
                "--skip-vix",
                "--skip-verify",
                "--state-file",
                state,
                "--lock-file",
                lock,
            ])
            self.assertEqual(first.returncode, 0, first.stdout)
            self.assertIn("auto_state: recorded success", first.stdout)

            second = run_cli([
                REFRESH_RUNNER,
                "--auto",
                "--skip-es",
                "--skip-vix",
                "--skip-verify",
                "--state-file",
                state,
                "--lock-file",
                lock,
            ])
            self.assertEqual(second.returncode, 0, second.stdout)
            self.assertIn("data_refresh_status: skipped", second.stdout)

            existing_lock = temp / "existing.lock"
            existing_lock.write_text("held\n", encoding="utf-8")
            locked = run_cli([
                REFRESH_RUNNER,
                "--auto",
                "--skip-es",
                "--skip-vix",
                "--skip-verify",
                "--state-file",
                temp / "other-state.json",
                "--lock-file",
                existing_lock,
                "--force-auto",
            ])
            self.assertEqual(locked.returncode, 3, locked.stdout)
            self.assertIn("lock already exists", locked.stdout)


if __name__ == "__main__":
    unittest.main(verbosity=2)
