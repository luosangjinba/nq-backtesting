#!/usr/bin/env python3
"""Verify the target bars endpoint is a backend-only delegated boundary."""

from __future__ import annotations

import pathlib


REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]
V4_ROOT = REPO_ROOT / "v4"

api_source = (V4_ROOT / "v4_api.py").read_text(encoding="utf-8")
handler_source = (V4_ROOT / "server" / "bars_handler.py").read_text(encoding="utf-8")
service_source = (V4_ROOT / "server" / "target_bars_service.py").read_text(encoding="utf-8")

for expected in [
    "from server import target_bars_service",
    "handle_target_bars_request",
    'elif path == "/v4/target_bars":',
    "def _handle_target_bars",
    "query_target_bars=query_target_bars",
]:
    assert expected in api_source, expected

for expected in [
    "def handle_bars_request",
    "tf = int(params.get(\"tf\"",
    "validation = validate_range(start, end, tf)",
    "bars = query_bars(db_path, table_name, instrument, start, end, tf)",
]:
    assert expected in handler_source, f"/v4/bars behavior should remain unchanged: {expected}"

for expected in [
    "def handle_target_bars_request",
    "record = query_target_bars(db_path, table_name, instrument, start, end, tf)",
    "send_json(record)",
]:
    assert expected in handler_source, expected

for expected in [
    "def query_target_bars",
    "normalize_target_timeframe_id",
    "_TARGET_BARS_CACHE",
    "target-bars-service",
]:
    assert expected in service_source, expected

print("target bars api boundary step281 smoke passed")
