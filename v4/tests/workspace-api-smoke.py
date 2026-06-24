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

    expect_value_error(lambda: v4_api.read_workspace_document("../../bad"))
    expect_value_error(lambda: v4_api.read_workspace_document("display-preferences", "NQ"))
    expect_value_error(
        lambda: v4_api.write_workspace_document(
            {
                "domain": "display-preferences",
                "payload": ["not", "an", "object"],
            }
        )
    )

print("workspace api smoke passed")
