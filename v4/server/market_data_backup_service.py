"""Recoverable market-data database backup for guarded maintenance writes."""

from __future__ import annotations

import os
import shutil
from datetime import datetime, timezone
from pathlib import Path

import duckdb


def _default_backup_dir():
    configured = os.environ.get("V4_MARKET_DATA_BACKUP_DIR", "").strip()
    if configured:
        return Path(configured).expanduser().resolve()
    return Path.home() / ".local" / "share" / "replay-lab" / "backups" / "market-data"


def backup_market_data_database(db_path, *, backup_dir=None, now=None):
    source = Path(db_path).expanduser().resolve()
    if not source.exists() or not source.is_file():
        raise ValueError(f"Market-data database does not exist: {source}")
    destination_dir = Path(backup_dir).expanduser().resolve() if backup_dir else _default_backup_dir()
    destination_dir.mkdir(parents=True, exist_ok=True)
    current = now or datetime.now(timezone.utc)
    label = current.strftime("%Y%m%d_%H%M%S_%fZ")
    destination = destination_dir / f"trading_data.prewrite.{label}.duckdb"
    partial = destination.with_suffix(f"{destination.suffix}.partial")
    try:
        shutil.copy2(source, partial)
        source_size = source.stat().st_size
        backup_size = partial.stat().st_size
        if source_size <= 0 or backup_size != source_size:
            raise ValueError("Market-data backup size verification failed")
        with duckdb.connect(str(partial), read_only=True) as conn:
            table_count = conn.execute(
                "select count(*) from information_schema.tables where table_name = 'futures_1m'"
            ).fetchone()[0]
            if table_count != 1:
                raise ValueError("Market-data backup restore smoke could not read futures_1m")
            row_count = int(conn.execute("select count(*) from futures_1m").fetchone()[0])
        partial.replace(destination)
    except Exception:
        partial.unlink(missing_ok=True)
        raise
    return {
        "ok": True,
        "returncode": 0,
        "command": "market data prewrite backup",
        "backupPath": str(destination),
        "output": "\n".join([
            "backup_status: ok",
            f"database_source: {source}",
            f"database_backup: {destination}",
            f"database_backup_size: {backup_size}",
            f"backup_rows: {row_count}",
            "restore_smoke_status: ok",
        ]),
    }
