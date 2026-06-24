#!/usr/bin/env python3
"""Smoke test backup restore smoke reports default-user workspace files."""

from __future__ import annotations

import importlib.util
import json
import tarfile
import tempfile
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT_PATH = REPO_ROOT / "v4" / "scripts" / "backup_v4_data.py"
spec = importlib.util.spec_from_file_location("backup_v4_data", SCRIPT_PATH)
backup_v4_data = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backup_v4_data)


with tempfile.TemporaryDirectory(prefix="v4-backup-user-workspace-") as temp_dir:
    root = Path(temp_dir)
    data_dir = root / "data"
    data_dir.mkdir()

    for relative in backup_v4_data.KEY_FILES:
        path = data_dir / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("x\n", encoding="utf-8")

    pda_path = data_dir / "users" / "default" / "workspaces" / "default" / "instruments" / "NQ" / "pda-annotations.json"
    pda_path.parent.mkdir(parents=True, exist_ok=True)
    pda_path.write_text(
        json.dumps(
            {
                "user_id": "default",
                "workspace_id": "default",
                "domain": "pda-annotations",
                "instrument": "NQ",
                "payload": {"annotations": [{"id": "pda_1"}]},
            }
        ),
        encoding="utf-8",
    )

    tar_path = root / "v4-data.test.tar.gz"
    with tarfile.open(tar_path, "w:gz") as archive:
        archive.add(data_dir, arcname="data")

    ok, detail = backup_v4_data.restore_smoke(tar_path)
    assert ok is True
    assert "user_workspace_files: 1" in detail

print("backup user workspace smoke passed")
