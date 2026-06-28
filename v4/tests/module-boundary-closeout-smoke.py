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
inspector_page_router_source = read("src/ui/inspector/inspector-page-router.js")
replay_source = read("src/ui/replay-controls.js")
toolbar_source = read("src/ui/toolbar.js")
calendar_panel_source = read("src/ui/inspector/calendar-panel.js")
data_maintenance_html = read("data-maintenance.html")
tradovate_importer_source = read("src/live-record/tradovate-performance-importer.js")
review_archive_source = read("src/review/review-archive.js")
review_archive_prepare_source = read("src/review/review-archive-import-prepare.js")
style_source = read("style.css")
comparison_style_source = read("styles/comparison-window.css")
daily_regime_range_path = V4_ROOT / "src/daily-regime/daily-regime-range.js"
daily_regime_trend_path = V4_ROOT / "src/daily-regime/daily-regime-trend.js"

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
    "./inspector/inspector-page-router.js",
    "./inspector/inspector-calendar-sync.js",
]:
    assert expected in inspector_source, f"inspector-sidebar.js should compose router boundary: {expected}"

assert "./inspector-detail-renderer.js" in inspector_page_router_source, (
    "inspector-page-router.js should compose the extracted detail renderer"
)

for forbidden in [
    "function handleInspectorClick",
    "function handleInspectorChange",
    "function renderDetailPanel",
    "function renderCalendarPage",
    "function setupCalendarDateSync",
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

assert '<script type="module" src="./src/maintenance/data-maintenance-app.js"></script>' in data_maintenance_html, (
    "data-maintenance.html should keep a single maintenance module entry"
)
for forbidden in [
    "function resolveApiBase(",
    "function summarize(",
    "buildTradovateLiveRecordArchives",
]:
    assert forbidden not in data_maintenance_html, f"data-maintenance.html regained inline app logic: {forbidden}"

assert len(tradovate_importer_source.splitlines()) < 80, (
    "tradovate-performance-importer.js should remain a small compatibility facade"
)
for expected in [
    "./tradovate-csv-parsers.js",
    "./tradovate-file-alignment.js",
    "./tradovate-live-record-builder.js",
]:
    assert expected in tradovate_importer_source, f"Tradovate facade should re-export split module: {expected}"
for forbidden in [
    "function parseCsvRows",
    "function alignTradovateFiles",
    "function buildLiveRecordSet",
]:
    assert forbidden not in tradovate_importer_source, f"Tradovate facade regained implementation: {forbidden}"

for expected in [
    "./review-archive-import-prepare.js",
    "./review-archive-store-loader.js",
]:
    assert expected in review_archive_source, f"review-archive.js should compose import boundary: {expected}"
assert "./review-archive-import-maps.js" in review_archive_prepare_source, (
    "review-archive-import-prepare.js should compose linked-ref map helpers"
)
for forbidden in [
    "function prepareImportedOrderReviews",
    "function prepareImportedLiveRecords",
    "function remapOrderReviewRef",
    "function loadPreparedReviewImport",
]:
    assert forbidden not in review_archive_source, f"review-archive.js regained import implementation: {forbidden}"

assert '@import url("./styles/comparison-window.css");' in style_source, (
    "style.css should import the extracted comparison window stylesheet"
)
assert ".comparison-window-root" not in style_source, (
    "comparison window root styles should stay in styles/comparison-window.css"
)
assert ".comparison-window-root" in comparison_style_source, (
    "styles/comparison-window.css should own comparison window styles"
)

assert not daily_regime_range_path.exists(), (
    "daily-regime-range.js should not return as an unconnected runtime module; "
    "daily range regime is currently loaded from data/daily-regime-*.csv"
)
assert not daily_regime_trend_path.exists(), (
    "daily-regime-trend.js should not return as an unconnected runtime module; "
    "daily trend regime is currently loaded from data/daily-regime-*.csv"
)

print("module boundary closeout smoke passed")
