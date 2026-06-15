#!/usr/bin/env python3
"""Offline tests for the V4 economic calendar importer."""

from __future__ import annotations

import importlib.util
import csv
import subprocess
import sys
import tempfile
import unittest
from datetime import date
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
IMPORTER = REPO_ROOT / "v4" / "scripts" / "update_economic_calendar.py"


def run_importer(args: list[object]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(IMPORTER), *[str(arg) for arg in args]],
        cwd=str(REPO_ROOT),
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )


def load_importer():
    spec = importlib.util.spec_from_file_location("update_economic_calendar", IMPORTER)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


class EconomicCalendarImporterTests(unittest.TestCase):
    def test_parse_year_month_selector_for_forex_factory_url(self) -> None:
        importer = load_importer()

        selector = importer.parse_month_selector("2025-01")

        self.assertEqual(selector.slug, "2025-01")
        self.assertEqual(selector.display_name, "January 2025")
        self.assertEqual(selector.forex_factory_selector, "jan.2025")

    def test_parse_this_and_next_relative_to_today(self) -> None:
        importer = load_importer()

        this_month = importer.parse_month_selector("this", today=date(2026, 6, 15))
        next_month = importer.parse_month_selector("next", today=date(2026, 12, 15))

        self.assertEqual(this_month.slug, "2026-06")
        self.assertEqual(this_month.forex_factory_selector, "jun.2026")
        self.assertEqual(next_month.slug, "2027-01")
        self.assertEqual(next_month.forex_factory_selector, "jan.2027")

    def test_iter_month_selectors_covers_inclusive_range(self) -> None:
        importer = load_importer()

        selectors = importer.iter_month_selectors(date(2025, 11, 30), date(2026, 2, 1))

        self.assertEqual([selector.slug for selector in selectors], [
            "2025-11",
            "2025-12",
            "2026-01",
            "2026-02",
        ])
        self.assertEqual(selectors[-1].forex_factory_selector, "feb.2026")

    def test_invalid_month_selector_fails_readably(self) -> None:
        importer = load_importer()

        with self.assertRaisesRegex(ValueError, "expected YYYY-MM"):
            importer.parse_month_selector("January")
        with self.assertRaisesRegex(ValueError, "month must be 01-12"):
            importer.parse_month_selector("2025-13")

    def test_normalize_raw_rows_filters_and_converts_times(self) -> None:
        importer = load_importer()
        selector = importer.parse_month_selector("2025-01")
        raw_rows = [
            {"date": "Thu Jan 2"},
            {"time": "5:30am", "currency": "USD", "impact": "red", "event": "Unemployment Claims", "actual": "211K"},
            {"time": "6:30am", "currency": "CAD", "impact": "orange", "event": "Manufacturing PMI", "actual": "52.2"},
            {"time": "All Day", "currency": "USD", "impact": "gray", "event": "Bank Holiday"},
        ]

        rows = importer.normalize_raw_rows(
            raw_rows,
            selector=selector,
            source_timezone="America/Los_Angeles",
            target_timezone="America/New_York",
            currencies={"USD"},
            impacts={"red", "orange", "yellow", "gray"},
            scraped_at="2026-06-15T00:00:00+00:00",
        )

        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["date"], "02/01/2025")
        self.assertEqual(rows[0]["time"], "08:30")
        self.assertEqual(rows[0]["event"], "Unemployment Claims")
        self.assertEqual(rows[0]["actual"], "211K")
        self.assertEqual(rows[1]["time"], "All Day")

    def test_write_raw_month_outputs_csv_and_metadata(self) -> None:
        importer = load_importer()
        selector = importer.parse_month_selector("2025-01")
        rows = [{
            "time": "08:30",
            "timezone": "America/New_York",
            "currency": "USD",
            "impact": "red",
            "event": "Unemployment Claims",
            "detail": "https://example.test/detail",
            "actual": "211K",
            "forecast": "",
            "previous": "",
            "day": "Thu",
            "date": "02/01/2025",
            "scraped_at": "2026-06-15T00:00:00+00:00",
        }]

        with tempfile.TemporaryDirectory() as temp_dir:
            output = importer.write_raw_month(Path(temp_dir), selector, rows, {"month": "2025-01"})
            with output.open(newline="", encoding="utf-8") as handle:
                loaded = list(csv.DictReader(handle))

            self.assertEqual(output.name, "2025-01.csv")
            self.assertEqual(loaded[0]["event"], "Unemployment Claims")
            self.assertTrue((Path(temp_dir) / "2025-01.json").exists())

    def test_convert_raw_rows_to_v4_schema(self) -> None:
        importer = load_importer()
        rows = importer.convert_raw_rows_to_v4([
            {
                "date": "02/01/2025",
                "time": "08:30",
                "timezone": "America/New_York",
                "currency": "USD",
                "impact": "red",
                "event": "Unemployment Claims",
                "actual": "211K",
                "forecast": "222K",
                "previous": "220K",
            },
            {
                "date": "01/01/2025",
                "time": "All Day",
                "timezone": "America/New_York",
                "currency": "USD",
                "impact": "gray",
                "event": "Bank Holiday",
            },
        ])

        self.assertEqual([row["title"] for row in rows], ["Bank Holiday", "Unemployment Claims"])
        self.assertEqual(rows[0]["event_type"], "holiday")
        self.assertEqual(rows[0]["all_day"], "true")
        self.assertEqual(rows[0]["default_visible"], "true")
        self.assertEqual(rows[1]["event_date"], "2025-01-02")
        self.assertEqual(rows[1]["event_time_et"], "2025-01-02T08:30:00-05:00")
        self.assertEqual(rows[1]["event_time_utc"], "2025-01-02T13:30:00Z")
        self.assertEqual(rows[1]["impact"], "High")
        self.assertEqual(rows[1]["forecast"], "222K")

    def test_non_clock_time_is_skipped_without_crashing(self) -> None:
        importer = load_importer()

        rows = importer.convert_raw_rows_to_v4([{
            "date": "03/11/2025",
            "time": "Sep 27th",
            "timezone": "America/New_York",
            "currency": "USD",
            "impact": "yellow",
            "event": "Nonstandard Date Event",
        }])

        self.assertEqual(rows, [])

    def test_convert_only_reads_raw_dir_and_writes_candidate_csv(self) -> None:
        importer = load_importer()
        with tempfile.TemporaryDirectory() as temp_dir:
            temp = Path(temp_dir)
            raw = temp / "raw"
            raw.mkdir()
            raw_csv = raw / "2025-01.csv"
            raw_csv.write_text(
                "\n".join([
                    ",".join(importer.RAW_COLUMNS),
                    "08:30,America/New_York,USD,red,Unemployment Claims,,211K,222K,220K,Thu,02/01/2025,now",
                    "10:00,America/New_York,USD,yellow,Construction Spending m/m,,0.0%,0.3%,0.5%,Thu,02/01/2025,now",
                    "",
                ]),
                encoding="utf-8",
            )
            out = temp / "candidate.csv"

            result = importer.convert_raw_calendar(type("Args", (), {
                "raw_dir": str(raw),
                "output_dir": str(raw),
                "candidate_csv": str(out),
                "from_date": "2025-01-02",
                "to_date": "2025-01-02",
            })())

            self.assertEqual(result, 0)
            with out.open(newline="", encoding="utf-8") as handle:
                loaded = list(csv.DictReader(handle))
            self.assertEqual(len(loaded), 2)
            self.assertEqual(loaded[0]["event_date"], "2025-01-02")
            self.assertEqual(loaded[0]["title"], "Unemployment Claims")

    def test_dry_run_reports_append_only_counts_from_raw_dir(self) -> None:
        importer = load_importer()
        with tempfile.TemporaryDirectory() as temp_dir:
            temp = Path(temp_dir)
            existing = temp / "economic_calendar.csv"
            raw = temp / "raw"
            raw.mkdir()
            existing.write_text(
                "\n".join([
                    ",".join(importer.V4_COLUMNS),
                    "2025-01-02,2025-01-02T08:30:00-05:00,2025-01-02T13:30:00Z,USD,Unemployment Claims,High,economic,false,true,211K,222K,220K",
                    "",
                ]),
                encoding="utf-8",
            )
            (raw / "2025-01.csv").write_text(
                "\n".join([
                    ",".join(importer.RAW_COLUMNS),
                    "08:30,America/New_York,USD,red,Unemployment Claims,,211K,,,Thu,02/01/2025,now",
                    "10:00,America/New_York,USD,yellow,Construction Spending m/m,,0.0%,,,Fri,03/01/2025,now",
                    "",
                ]),
                encoding="utf-8",
            )

            result = run_importer([
                "--dry-run",
                "--csv",
                existing,
                "--raw-dir",
                raw,
                "--from-date",
                "2025-01-02",
                "--to-date",
                "2025-01-03",
            ])

            self.assertEqual(result.returncode, 0, result.stdout)
            self.assertIn("economic_calendar_dry_run_status: ok", result.stdout)
            self.assertIn("existing_rows: 1", result.stdout)
            self.assertIn("candidate_rows: 2", result.stdout)
            self.assertIn("existing_candidate_keys: 1", result.stdout)
            self.assertIn("would_append_rows: 1", result.stdout)
            self.assertIn("skipped_overlap_rows: 0", result.stdout)
            self.assertIn("write_status: dry-run; no CSV changes were made", result.stdout)
            self.assertEqual(existing.read_text(encoding="utf-8").count("\n"), 2)

    def test_write_appends_only_after_existing_max_and_creates_backup(self) -> None:
        importer = load_importer()
        with tempfile.TemporaryDirectory() as temp_dir:
            temp = Path(temp_dir)
            existing = temp / "economic_calendar.csv"
            raw = temp / "raw"
            backups = temp / "backups"
            raw.mkdir()
            existing.write_text(
                "\n".join([
                    ",".join(importer.V4_COLUMNS),
                    "2025-01-02,2025-01-02T08:30:00-05:00,2025-01-02T13:30:00Z,USD,Unemployment Claims,High,economic,false,true,211K,222K,220K",
                    "",
                ]),
                encoding="utf-8",
            )
            (raw / "2025-01.csv").write_text(
                "\n".join([
                    ",".join(importer.RAW_COLUMNS),
                    "08:30,America/New_York,USD,red,Unemployment Claims,,211K,,,Thu,02/01/2025,now",
                    "09:45,America/New_York,USD,orange,Final Manufacturing PMI,,49.4,,,Thu,02/01/2025,now",
                    "10:00,America/New_York,USD,yellow,Construction Spending m/m,,0.0%,,,Fri,03/01/2025,now",
                    "",
                ]),
                encoding="utf-8",
            )

            result = run_importer([
                "--write",
                "--confirm-write",
                "--csv",
                existing,
                "--backup-dir",
                backups,
                "--raw-dir",
                raw,
                "--from-date",
                "2025-01-02",
                "--to-date",
                "2025-01-03",
            ])

            self.assertEqual(result.returncode, 0, result.stdout)
            self.assertIn("economic_calendar_write_status: ok", result.stdout)
            self.assertIn("appended_rows: 1", result.stdout)
            self.assertIn("skipped_overlap_rows: 1", result.stdout)
            self.assertEqual(len(list(backups.glob("economic_calendar_*.csv"))), 1)
            with existing.open(newline="", encoding="utf-8") as handle:
                loaded = list(csv.DictReader(handle))
            self.assertEqual([row["title"] for row in loaded], ["Unemployment Claims", "Construction Spending m/m"])

    def test_write_requires_confirm_write(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp = Path(temp_dir)
            existing = temp / "economic_calendar.csv"
            raw = temp / "raw"
            raw.mkdir()
            existing.write_text(",".join(load_importer().V4_COLUMNS) + "\n", encoding="utf-8")

            result = run_importer(["--write", "--csv", existing, "--raw-dir", raw])

            self.assertEqual(result.returncode, 1, result.stdout)
            self.assertIn("--write requires --confirm-write", result.stdout)


if __name__ == "__main__":
    unittest.main()
