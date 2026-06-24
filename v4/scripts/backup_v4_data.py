#!/usr/bin/env python3
"""Back up V4 DuckDB and data directory, optionally with a restore smoke."""

from __future__ import annotations

import argparse
import os
import shutil
import tarfile
import tempfile
from datetime import datetime
from pathlib import Path


V4_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = Path(os.environ.get("V4_TRADING_DB", V4_ROOT / "data" / "trading_data.duckdb"))
DEFAULT_DATA_DIR = V4_ROOT / "data"
DEFAULT_BACKUP_DIR = Path("/var/backups/trading/v4")
KEY_FILES = [
    "trading_data.duckdb",
    "economic_calendar/economic_calendar_usd_events.csv",
    "vix-daily.csv",
    "vix-monthly.csv",
    "daily-regime-nq.csv",
    "daily-regime-es.csv",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Back up V4 DB and data directory.")
    parser.add_argument("--db", default=str(DEFAULT_DB), help="DuckDB path.")
    parser.add_argument("--data-dir", default=str(DEFAULT_DATA_DIR), help="V4 data directory.")
    parser.add_argument("--backup-dir", default=str(DEFAULT_BACKUP_DIR), help="Backup output directory.")
    parser.add_argument("--label", default="", help="Optional backup label.")
    parser.add_argument("--restore-smoke", action="store_true", help="Extract data tarball and verify key files.")
    return parser.parse_args()


def backup_label(raw: str) -> str:
    suffix = raw.strip().replace("/", "-").replace(" ", "-")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"{timestamp}-{suffix}" if suffix else timestamp


def ensure_readable_file(path: Path, label: str) -> None:
    if not path.exists() or not path.is_file():
        raise FileNotFoundError(f"{label} not found: {path}")
    if path.stat().st_size <= 0:
        raise ValueError(f"{label} is empty: {path}")


def restore_smoke(tar_path: Path) -> tuple[bool, str]:
    with tempfile.TemporaryDirectory(prefix="v4-restore-smoke-") as temp_dir:
        restore_dir = Path(temp_dir)
        with tarfile.open(tar_path, "r:gz") as archive:
            archive.extractall(restore_dir)
        data_dir = restore_dir / "data"
        missing = []
        for relative in KEY_FILES:
            path = data_dir / relative
            if not path.exists() or path.stat().st_size <= 0:
                missing.append(relative)
        if missing:
            return False, f"missing_after_restore: {', '.join(missing)}"
        user_workspace_dir = data_dir / "users" / "default"
        user_workspace_files = 0
        if user_workspace_dir.exists():
            user_workspace_files = sum(1 for path in user_workspace_dir.rglob("*") if path.is_file())
        return True, (
            f"restore_dir: {restore_dir} "
            f"verified_files: {len(KEY_FILES)} "
            f"user_workspace_files: {user_workspace_files}"
        )


def main() -> int:
    args = parse_args()
    db_path = Path(args.db).expanduser().resolve()
    data_dir = Path(args.data_dir).expanduser().resolve()
    backup_dir = Path(args.backup_dir).expanduser().resolve()
    label = backup_label(args.label)

    ensure_readable_file(db_path, "database")
    if not data_dir.exists() or not data_dir.is_dir():
        raise FileNotFoundError(f"data directory not found: {data_dir}")

    backup_dir.mkdir(parents=True, exist_ok=True)
    db_backup = backup_dir / f"trading_data.{label}.duckdb"
    data_backup = backup_dir / f"v4-data.{label}.tar.gz"

    shutil.copy2(db_path, db_backup)
    with tarfile.open(data_backup, "w:gz") as archive:
        archive.add(data_dir, arcname="data")

    print("backup_status: ok")
    print(f"database_source: {db_path}")
    print(f"data_dir_source: {data_dir}")
    print(f"database_backup: {db_backup}")
    print(f"data_backup: {data_backup}")
    print(f"database_backup_size: {db_backup.stat().st_size}")
    print(f"data_backup_size: {data_backup.stat().st_size}")

    if args.restore_smoke:
        ok, detail = restore_smoke(data_backup)
        print(f"restore_smoke_status: {'ok' if ok else 'failed'}")
        print(f"restore_smoke_detail: {detail}")
        return 0 if ok else 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
