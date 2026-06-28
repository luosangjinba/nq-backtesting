#!/usr/bin/env python3
"""Verify v4_api delegates endpoint handling to server handler modules."""

from __future__ import annotations

import pathlib


REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]
V4_ROOT = REPO_ROOT / "v4"

api_source = (V4_ROOT / "v4_api.py").read_text(encoding="utf-8")

required_imports = [
    "from server.bars_handler import handle_bars_request, handle_price_request",
    "from server.economic_calendar_handler import handle_economic_events_request",
    "from server.maintenance_handler import handle_data_maintenance_post_request",
    "from server.workspace_handler import handle_workspace_get_request, handle_workspace_put_request",
]

for line in required_imports:
    assert line in api_source, line

required_calls = [
    "handle_bars_request(",
    "handle_price_request(",
    "handle_economic_events_request(",
    "handle_workspace_get_request(",
    "handle_workspace_put_request(",
    "handle_data_maintenance_post_request(",
]

for call in required_calls:
    assert call in api_source, call

for path in [
    V4_ROOT / "server" / "bars_handler.py",
    V4_ROOT / "server" / "workspace_handler.py",
    V4_ROOT / "server" / "maintenance_handler.py",
    V4_ROOT / "server" / "economic_calendar_handler.py",
]:
    assert path.exists(), str(path)

print("backend handler boundary smoke passed")
