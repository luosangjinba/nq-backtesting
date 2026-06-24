#!/usr/bin/env python3
"""Smoke test default-user workspace storage helpers."""

from __future__ import annotations

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


def expect_value_error(fn):
    try:
        fn()
    except ValueError:
        return
    raise AssertionError("Expected ValueError")


with tempfile.TemporaryDirectory(prefix="v4-workspace-smoke-") as temp_dir:
    v4_api.WORKSPACE_BASE_DIR = temp_dir

    missing = v4_api.read_workspace_document("display-preferences")
    assert missing["ok"] is True
    assert missing["found"] is False
    assert missing["user_id"] == "default"
    assert missing["workspace_id"] == "default"
    assert missing["payload"] is None

    saved = v4_api.write_workspace_document(
        {
            "domain": "display-preferences",
            "version": 1,
            "payload": {
                "version": 1,
                "savedAt": "2026-06-23T20:00:00Z",
                "preferences": {
                    "uiScale": "125",
                    "chartTextScale": "large",
                    "inspectorDensity": "normal",
                },
            },
        }
    )
    assert saved["ok"] is True
    assert saved["found"] is True
    assert saved["user_id"] == "default"
    assert saved["workspace_id"] == "default"
    assert saved["domain"] == "display-preferences"
    assert saved["instrument"] is None
    assert saved["revision"]

    loaded = v4_api.read_workspace_document("display-preferences")
    assert loaded["payload"]["preferences"]["uiScale"] == "125"

    pda_saved = v4_api.write_workspace_document(
        {
            "domain": "pda-annotations",
            "instrument": "NQ",
            "version": 1,
            "payload": {
                "version": 1,
                "savedAt": "2026-06-23T20:00:00Z",
                "instrument": "NQ",
                "annotations": [
                    {
                        "id": "manual_bsl_1",
                        "type": "bsl",
                        "price": 30400.25,
                        "sourceChartId": "comparison-window",
                        "sourceInstrument": "NQ",
                        "sourceTimeframe": 1,
                        "createdAt": 1780000000000,
                        "updatedAt": 1780000000000,
                    }
                ],
            },
        }
    )
    assert pda_saved["domain"] == "pda-annotations"
    assert pda_saved["instrument"] == "NQ"
    assert pda_saved["user_id"] == "default"
    assert pda_saved["workspace_id"] == "default"

    pda_loaded = v4_api.read_workspace_document("pda-annotations", "NQ")
    assert pda_loaded["payload"]["annotations"][0]["sourceChartId"] == "comparison-window"

    segment_saved = v4_api.write_workspace_document(
        {
            "domain": "market-segments",
            "instrument": "NQ",
            "version": 2,
            "payload": {
                "version": 2,
                "savedAt": "2026-06-24T05:00:00Z",
                "instrument": "NQ",
                "segments": [{"id": "seg_1"}],
                "segmentGroups": [{"id": "group_1", "type": "composite-move", "childSegmentIds": ["seg_1", "seg_2"]}],
            },
        }
    )
    assert segment_saved["domain"] == "market-segments"
    assert segment_saved["instrument"] == "NQ"
    segment_loaded = v4_api.read_workspace_document("market-segments", "NQ")
    assert segment_loaded["payload"]["segmentGroups"][0]["type"] == "composite-move"

    order_saved = v4_api.write_workspace_document(
        {
            "domain": "order-reviews",
            "instrument": "NQ",
            "version": 1,
            "payload": {"version": 1, "instrument": "NQ", "orderReviews": [{"id": "order_1"}]},
        }
    )
    assert order_saved["domain"] == "order-reviews"

    live_saved = v4_api.write_workspace_document(
        {
            "domain": "live-records",
            "instrument": "NQ",
            "version": 1,
            "payload": {"version": 1, "instrument": "NQ", "liveRecords": [{"id": "live_1"}]},
        }
    )
    assert live_saved["domain"] == "live-records"

    chart_notes_saved = v4_api.write_workspace_document(
        {
            "domain": "chart-notes",
            "instrument": "NQ",
            "version": 1,
            "payload": {"version": 1, "instrument": "NQ", "chartNotes": [{"id": "note_1"}]},
        }
    )
    assert chart_notes_saved["domain"] == "chart-notes"

    daily_time_saved = v4_api.write_workspace_document(
        {
            "domain": "daily-time-reviews",
            "instrument": "NQ",
            "version": 1,
            "payload": {"version": 1, "instrument": "NQ", "dailyTimeReviews": [{"id": "dtr_1"}]},
        }
    )
    assert daily_time_saved["domain"] == "daily-time-reviews"

    time_overlay_saved = v4_api.write_workspace_document(
        {
            "domain": "time-overlays",
            "instrument": "NQ",
            "version": 1,
            "payload": {"version": 1, "instrument": "NQ", "settings": {"eventTimes": [{"id": "time_1"}]}},
        }
    )
    assert time_overlay_saved["domain"] == "time-overlays"

    event_notes_saved = v4_api.write_workspace_document(
        {
            "domain": "economic-event-notes",
            "instrument": "NQ",
            "version": 1,
            "payload": {"version": 1, "instrument": "NQ", "notes": [{"eventId": "event_1", "note": "review"}]},
        }
    )
    assert event_notes_saved["domain"] == "economic-event-notes"

    entry_catalog_saved = v4_api.write_workspace_document(
        {
            "domain": "entry-context-catalog",
            "version": 1,
            "payload": {"version": 1, "catalog": {"patterns": [{"id": "pattern_1"}]}},
        }
    )
    assert entry_catalog_saved["domain"] == "entry-context-catalog"
    assert entry_catalog_saved["instrument"] is None

    expect_value_error(lambda: v4_api.read_workspace_document("../../bad"))
    expect_value_error(lambda: v4_api.read_workspace_document("display-preferences", "NQ"))
    expect_value_error(lambda: v4_api.read_workspace_document("entry-context-catalog", "NQ"))
    expect_value_error(lambda: v4_api.read_workspace_document("chart-notes"))
    expect_value_error(lambda: v4_api.read_workspace_document("daily-time-reviews"))
    expect_value_error(lambda: v4_api.read_workspace_document("economic-event-notes"))
    expect_value_error(lambda: v4_api.read_workspace_document("live-records"))
    expect_value_error(lambda: v4_api.read_workspace_document("pda-annotations"))
    expect_value_error(lambda: v4_api.read_workspace_document("market-segments"))
    expect_value_error(lambda: v4_api.read_workspace_document("order-reviews"))
    expect_value_error(lambda: v4_api.read_workspace_document("time-overlays"))
    expect_value_error(
        lambda: v4_api.write_workspace_document(
            {
                "domain": "display-preferences",
                "payload": ["not", "an", "object"],
            }
        )
    )

print("workspace api smoke passed")
