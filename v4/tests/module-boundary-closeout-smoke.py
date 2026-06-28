#!/usr/bin/env python3
"""Closeout guard for V4 module boundaries and resolved dead-code decisions."""

from __future__ import annotations

import pathlib


REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]
V4_ROOT = REPO_ROOT / "v4"


def read(relative_path: str) -> str:
    return (V4_ROOT / relative_path).read_text(encoding="utf-8")


api_source = read("v4_api.py")
inspector_source = read("src/ui/inspector-sidebar.js")
replay_source = read("src/ui/replay-controls.js")
toolbar_source = read("src/ui/toolbar.js")
calendar_panel_source = read("src/ui/inspector/calendar-panel.js")
daily_regime_range_path = V4_ROOT / "src/daily-regime/daily-regime-range.js"

for expected in [
    "from server import bars_service",
    "from server import economic_calendar_service",
    "from server import economic_manual_import",
    "from server import local_env_service",
    "from server import maintenance_service",
    "from server import workspace_store",
]:
    assert expected in api_source, f"v4_api.py should compose service boundary: {expected}"

for forbidden in [
    "LOAD_RANGE_LIMITS_DAYS =",
    "ALLOWED_WORKSPACE_DOMAINS =",
    "LOCAL_ENV_VARIABLES =",
    "_MAINTENANCE_LOCK =",
    "ECONOMIC_CALENDAR_COLUMNS =",
    "ECONOMIC_MANUAL_COLUMNS =",
    "_ECONOMIC_EVENTS_CACHE =",
    "def _parse_local_env_lines",
    "def _manual_economic_rows_from_csv",
    "date_trunc('minute', ts)",
]:
    assert forbidden not in api_source, f"v4_api.py regained split implementation: {forbidden}"

for expected in [
    "./inspector/inspector-selection-router.js",
    "./inspector/inspector-action-router.js",
    "./inspector/inspector-change-router.js",
    "./inspector/inspector-archive-actions.js",
]:
    assert expected in inspector_source, f"inspector-sidebar.js should compose router boundary: {expected}"

for forbidden in [
    "function handleInspectorClick",
    "function handleInspectorChange",
    "bus.on('pda:selected'",
    "bus.on('segment:selected'",
    "action === 'export-pda'",
    "action === 'import-pda-file'",
]:
    assert forbidden not in inspector_source, f"inspector-sidebar.js regained routed implementation: {forbidden}"

for forbidden in [
    "../chart/chart-manager.js",
    "../chart/primary-chart-runtime.js",
    "../data/comparison-store.js",
    "../replay/replay-history-store.js",
]:
    assert forbidden not in replay_source, f"replay-controls.js bypassed replay boundary: {forbidden}"

for forbidden in [
    "resolveChartLoadRange",
    "loadPrimaryRangeCommand",
    "function renderLayoutMenu",
    "function renderSettingsMenu",
]:
    assert forbidden not in toolbar_source, f"toolbar.js regained controller implementation: {forbidden}"

for forbidden in [
    "function getLoadedDateRange",
    "function getMonthCells",
    "function addTimeReactionGroup",
    "function addChartNotesGroup",
]:
    assert forbidden not in calendar_panel_source, f"calendar-panel.js regained split data implementation: {forbidden}"

assert not daily_regime_range_path.exists(), (
    "daily-regime-range.js should not return as an unconnected runtime module; "
    "daily range regime is currently loaded from data/daily-regime-*.csv"
)

print("module boundary closeout smoke passed")
