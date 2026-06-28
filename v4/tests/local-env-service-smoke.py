#!/usr/bin/env python3
"""Exercise local env service status/write/delete helpers in a temp path."""

from __future__ import annotations

import pathlib
import sys
import tempfile


REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]
V4_ROOT = REPO_ROOT / "v4"
sys.path.insert(0, str(V4_ROOT))

from server.local_env_service import run_local_env_action  # noqa: E402


with tempfile.TemporaryDirectory(prefix="v4-local-env-smoke-") as temp_dir:
    env_path = pathlib.Path(temp_dir) / ".env.local"

    status = run_local_env_action({"action": "environment_status"}, path=str(env_path))
    assert status["ok"] is True
    assert status["command"] == "local environment status"
    assert "file_exists: false" in status["output"]

    written = run_local_env_action(
        {"action": "environment_write", "key": "V4_WEB_PORT", "value": "8123"},
        path=str(env_path),
    )
    assert written["ok"] is True
    assert "write_status: saved" in written["output"]
    assert "V4_WEB_PORT=8123" in env_path.read_text(encoding="utf-8")

    deleted = run_local_env_action(
        {"action": "environment_delete", "key": "V4_WEB_PORT"},
        path=str(env_path),
    )
    assert deleted["ok"] is True
    assert "delete_status: deleted" in deleted["output"]
    assert "V4_WEB_PORT" not in env_path.read_text(encoding="utf-8")

print("local env service smoke passed")
