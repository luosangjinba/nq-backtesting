#!/usr/bin/env python3
"""Verify bars validation/query implementation lives outside v4_api.py."""

from __future__ import annotations

import pathlib


REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]
V4_ROOT = REPO_ROOT / "v4"
api_source = (V4_ROOT / "v4_api.py").read_text(encoding="utf-8")
service_source = (V4_ROOT / "server" / "bars_service.py").read_text(encoding="utf-8")

for expected in [
    "from server import bars_service",
    "bars_service.validate_bars_request_range",
    "bars_service.query_v4_bars",
]:
    assert expected in api_source, f"v4_api.py should delegate bars behavior via {expected}"

for forbidden in [
    "LOAD_RANGE_LIMITS_DAYS =",
    "DEFAULT_LOAD_RANGE_LIMIT_DAYS =",
    "DAILY_ANCHOR_OFFSET =",
    "duration_seconds = (end_dt - start_dt).total_seconds()",
    "date_trunc('minute', ts)",
    "first(open order by ts)",
]:
    assert forbidden not in api_source, f"v4_api.py should not own bars implementation: {forbidden}"

for expected in [
    "LOAD_RANGE_LIMITS_DAYS =",
    "DEFAULT_LOAD_RANGE_LIMIT_DAYS =",
    "DAILY_ANCHOR_OFFSET =",
    "def validate_bars_request_range",
    "def query_v4_bars",
    "date_trunc('minute', ts)",
]:
    assert expected in service_source, f"bars_service.py should own {expected}"

print("bars service boundary smoke passed")
