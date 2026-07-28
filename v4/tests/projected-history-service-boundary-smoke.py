#!/usr/bin/env python3
"""Verify V7 projected history remains a delegated bounded read-only service."""

from __future__ import annotations

import pathlib


REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]
V4_ROOT = REPO_ROOT / "v4"
api_source = (V4_ROOT / "v4_api.py").read_text(encoding="utf-8")
handler_source = (V4_ROOT / "server" / "bars_handler.py").read_text(encoding="utf-8")
service_source = (V4_ROOT / "server" / "projected_history_service.py").read_text(encoding="utf-8")

for expected in [
    "from server import projected_history_service",
    'elif path == "/v4/projected_history":',
    "handle_projected_history_request",
    "query_projected_history=projected_history_service.query_projected_history",
]:
    assert expected in api_source, expected

for expected in [
    "def handle_projected_history_request",
    "query_projected_history(",
    "Missing 'tf' and/or 'session' parameter",
]:
    assert expected in handler_source, expected

for expected in [
    "MAXIMUM_PROJECTED_HISTORY_DAYS",
    "PROJECTED_HISTORY_CACHE_LIMIT",
    "def _instant_epoch_expression",
    "then 14400 else 18000 end",
    "projected-history-service",
]:
    assert expected in service_source, expected

print("projected history service boundary smoke passed")
