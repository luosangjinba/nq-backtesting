#!/usr/bin/env python3
"""Verify economic calendar query/manual import logic lives outside v4_api.py."""

from __future__ import annotations

import pathlib


REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]
V4_ROOT = REPO_ROOT / "v4"
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

print("economic calendar service boundary smoke passed")
