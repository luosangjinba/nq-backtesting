#!/usr/bin/env python3
"""Smoke test manual economic calendar CSV import."""

from __future__ import annotations

import csv
import importlib.util
import pathlib
import sys
import tempfile


REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]
V4_ROOT = REPO_ROOT / "v4"
sys.path.insert(0, str(V4_ROOT))

spec = importlib.util.spec_from_file_location("v4_api", V4_ROOT / "v4_api.py")
v4_api = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v4_api)


SAMPLE = """Title,Country,Date,Time,Impact,Forecast,Previous,URL
FOMC Member Waller Speaks,USD,06-22-2026,1:00pm,Low,,,https://www.forexfactory.com/calendar/839-us-fomc-member-waller-speaks
CPI m/m,CAD,06-22-2026,12:30pm,High,0.7%,0.4%,https://www.forexfactory.com/calendar/80-ca-cpi-mm
Existing Event,USD,06-20-2026,9:00am,High,1,2,https://example.com/existing
"""


with tempfile.TemporaryDirectory(prefix="v4-economic-manual-") as temp_dir:
    temp_path = pathlib.Path(temp_dir)
    csv_path = temp_path / "economic_calendar_usd_events.csv"
    backup_dir = temp_path / "backups"
    v4_api.ECONOMIC_CALENDAR_PATH = str(csv_path)
    v4_api.ECONOMIC_CALENDAR_BACKUP_DIR = str(backup_dir)

    v4_api._write_economic_calendar_rows([
        {
            "event_date": "2026-06-20",
            "event_time_et": "2026-06-20T09:00:00-04:00",
            "event_time_utc": "2026-06-20T13:00:00Z",
            "currency": "USD",
            "title": "Existing Event",
            "impact": "High",
            "event_type": "economic",
            "all_day": "false",
            "default_visible": "true",
            "actual": "",
            "forecast": "1",
            "previous": "2",
        }
    ])

    preview = v4_api.run_data_maintenance_action({
        "action": "economic_manual_preview",
        "filename": "manual.csv",
        "csvText": SAMPLE,
        "currency": "USD",
        "timezone": "America/New_York",
    })
    assert preview["ok"] is True
    assert "candidate_rows: 2" in preview["output"]
    assert "skipped_currency_rows: 1" in preview["output"]
    assert "would_append_rows: 1" in preview["output"]

    rows_before = list(csv.DictReader(csv_path.open(newline="", encoding="utf-8")))
    assert len(rows_before) == 1

    write = v4_api.run_data_maintenance_action({
        "action": "economic_manual_write",
        "filename": "manual.csv",
        "csvText": SAMPLE,
        "currency": "USD",
        "timezone": "America/New_York",
        "confirmText": "WRITE ECONOMIC",
    })
    assert write["ok"] is True
    assert "appended_rows: 1" in write["output"]

    rows_after = list(csv.DictReader(csv_path.open(newline="", encoding="utf-8")))
    assert len(rows_after) == 2
    assert rows_after[-1]["title"] == "FOMC Member Waller Speaks"
    assert rows_after[-1]["event_time_utc"] == "2026-06-22T17:00:00Z"
    assert list(backup_dir.glob("*.csv"))

print("economic manual import smoke passed")
