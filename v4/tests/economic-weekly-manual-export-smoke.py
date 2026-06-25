#!/usr/bin/env python3

from __future__ import annotations

import csv
import subprocess
import sys
import tempfile
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT = REPO_ROOT / "v4" / "scripts" / "export_weekly_economic_manual_csv.py"
RAW_COLUMNS = [
    "time",
    "timezone",
    "currency",
    "impact",
    "event",
    "detail",
    "actual",
    "forecast",
    "previous",
    "day",
    "date",
    "scraped_at",
]


def write_raw_month(raw_dir: Path) -> None:
    raw_dir.mkdir(parents=True, exist_ok=True)
    with (raw_dir / "2026-06.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=RAW_COLUMNS)
        writer.writeheader()
        writer.writerow({
            "time": "13:00",
            "timezone": "America/New_York",
            "currency": "USD",
            "impact": "yellow",
            "event": "FOMC Member Waller Speaks",
            "detail": "https://www.forexfactory.com/calendar#detail=1",
            "actual": "",
            "forecast": "",
            "previous": "",
            "day": "Mon",
            "date": "22/06/2026",
            "scraped_at": "2026-06-20T00:00:00Z",
        })
        writer.writerow({
            "time": "12:30",
            "timezone": "America/New_York",
            "currency": "CAD",
            "impact": "red",
            "event": "CPI m/m",
            "detail": "https://www.forexfactory.com/calendar#detail=2",
            "actual": "",
            "forecast": "0.7%",
            "previous": "0.4%",
            "day": "Mon",
            "date": "22/06/2026",
            "scraped_at": "2026-06-20T00:00:00Z",
        })
        writer.writerow({
            "time": "All Day",
            "timezone": "America/New_York",
            "currency": "USD",
            "impact": "gray",
            "event": "Bank Holiday",
            "detail": "https://www.forexfactory.com/calendar#detail=3",
            "actual": "",
            "forecast": "",
            "previous": "",
            "day": "Fri",
            "date": "26/06/2026",
            "scraped_at": "2026-06-20T00:00:00Z",
        })


def main() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        raw_dir = tmp_path / "raw"
        output = tmp_path / "manual.csv"
        write_raw_month(raw_dir)
        command = [
            sys.executable,
            str(SCRIPT),
            "--raw-dir",
            str(raw_dir),
            "--from-date",
            "2026-06-22",
            "--to-date",
            "2026-06-28",
            "--output",
            str(output),
        ]
        result = subprocess.run(command, cwd=REPO_ROOT, text=True, capture_output=True, check=False)
        assert result.returncode == 0, result.stdout + result.stderr
        assert "manual_rows: 2" in result.stdout
        with output.open(newline="", encoding="utf-8") as handle:
            rows = list(csv.DictReader(handle))
        assert rows == [
            {
                "Title": "FOMC Member Waller Speaks",
                "Country": "USD",
                "Date": "06-22-2026",
                "Time": "1:00pm",
                "Impact": "Low",
                "Forecast": "",
                "Previous": "",
                "URL": "",
            },
            {
                "Title": "Bank Holiday",
                "Country": "USD",
                "Date": "06-26-2026",
                "Time": "",
                "Impact": "Low",
                "Forecast": "",
                "Previous": "",
                "URL": "",
            },
        ]
    print("economic weekly manual export smoke passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
