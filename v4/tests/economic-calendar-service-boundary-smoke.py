#!/usr/bin/env python3
"""Verify economic calendar query/manual import logic lives outside v4_api.py."""

from __future__ import annotations

import csv
import pathlib
import sys
import tempfile


REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]
V4_ROOT = REPO_ROOT / "v4"
sys.path.insert(0, str(V4_ROOT))

from server import economic_calendar_service as calendar_service

api_source = (V4_ROOT / "v4_api.py").read_text(encoding="utf-8")
calendar_source = (V4_ROOT / "server" / "economic_calendar_service.py").read_text(encoding="utf-8")
manual_source = (V4_ROOT / "server" / "economic_manual_import.py").read_text(encoding="utf-8")

for expected in [
    "from server import economic_calendar_service",
    "from server import economic_manual_import",
    "economic_calendar_service.query_economic_events",
    "economic_manual_import.build_manual_economic_import_result",
]:
    assert expected in api_source, f"v4_api.py should delegate economic behavior via {expected}"

for forbidden in [
    "ECONOMIC_CALENDAR_COLUMNS =",
    "ECONOMIC_MANUAL_COLUMNS =",
    "ECONOMIC_EVENT_KEY_FIELDS =",
    "_ECONOMIC_EVENTS_CACHE =",
    "def _parse_manual_economic_date",
    "def _manual_economic_rows_from_csv",
    "def _event_time_from_et",
    "def _wall_timestamp_from_date_time",
]:
    assert forbidden not in api_source, f"v4_api.py should not own economic calendar detail: {forbidden}"

for expected in [
    "ECONOMIC_CALENDAR_COLUMNS =",
    "ECONOMIC_EVENT_KEY_FIELDS =",
    "_ECONOMIC_EVENTS_CACHE =",
    "def normalize_economic_event",
    "def load_economic_events",
    "def query_economic_events",
]:
    assert expected in calendar_source, f"economic_calendar_service.py should own {expected}"

for expected in [
    "ECONOMIC_MANUAL_COLUMNS =",
    "def manual_economic_rows_from_csv",
    "def build_manual_economic_import_result",
]:
    assert expected in manual_source, f"economic_manual_import.py should own {expected}"


def write_calendar_fixture(path, title, event_date):
    row = {column: "" for column in calendar_service.ECONOMIC_CALENDAR_COLUMNS}
    row.update({
        "event_date": event_date,
        "event_time_et": f"{event_date}T08:30:00-05:00",
        "event_time_utc": f"{event_date}T13:30:00Z",
        "currency": "USD",
        "title": title,
        "impact": "High",
        "event_type": "economic",
        "all_day": "false",
        "default_visible": "true",
    })
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=calendar_service.ECONOMIC_CALENDAR_COLUMNS)
        writer.writeheader()
        writer.writerow(row)


with tempfile.TemporaryDirectory(prefix="v4-economic-calendar-cache-") as temp_dir:
    temp_path = pathlib.Path(temp_dir)
    first_path = temp_path / "first.csv"
    second_path = temp_path / "second.csv"
    write_calendar_fixture(first_path, "First Fixture Event", "2026-01-01")
    write_calendar_fixture(second_path, "Second Fixture Event", "2026-01-02")

    calendar_service.configure_economic_calendar(path=first_path)
    first_titles = [event["title"] for event in calendar_service.load_economic_events()]
    assert first_titles == ["First Fixture Event"]

    calendar_service.configure_economic_calendar(path=second_path)
    second_titles = [event["title"] for event in calendar_service.load_economic_events()]
    assert second_titles == ["Second Fixture Event"], "calendar cache should reset when the configured path changes"

print("economic calendar service boundary smoke passed")
