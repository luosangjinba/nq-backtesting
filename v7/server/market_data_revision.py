"""Stable provenance identity for the active V7 DuckDB market dataset."""

from __future__ import annotations

import hashlib
import json
import os
from typing import Optional, Tuple


REVISION_ALGORITHM = "v7-duckdb-stat-v1"


class DatasetRevisionMismatch(RuntimeError):
    """The caller planned a query against a dataset that is no longer active."""

    def __init__(self, expected: str, current: str):
        self.expected = expected
        self.current = current
        super().__init__(
            f"dataset revision mismatch: expected {expected}, current {current}"
        )


class DatasetRevisionUnstable(RuntimeError):
    """The dataset changed repeatedly while a bounded read was in progress."""


def _file_identity(path: str) -> Optional[Tuple[int, int, int, int, int]]:
    try:
        stat = os.stat(path)
    except FileNotFoundError:
        return None
    if not os.path.isfile(path):
        return None
    return (
        int(stat.st_dev),
        int(stat.st_ino),
        int(stat.st_size),
        int(stat.st_mtime_ns),
        int(stat.st_ctime_ns),
    )


def resolve_dataset_revision(db_path: str, table_name: str) -> str:
    """Return a cheap revision that changes when the DB or its WAL changes."""

    database_identity = _file_identity(db_path)
    if database_identity is None:
        raise FileNotFoundError(f"market database is unavailable: {db_path}")
    payload = json.dumps(
        {
            "algorithm": REVISION_ALGORITHM,
            "database": database_identity,
            "table": str(table_name),
            "wal": _file_identity(f"{db_path}.wal"),
        },
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")
    digest = hashlib.sha256(payload).hexdigest()[:24]
    return f"{REVISION_ALGORITHM}-{digest}"


def resolve_dataset_revision_if_ready(
    db_path: str,
    table_name: str,
) -> Optional[str]:
    """Return ``None`` while first-run bootstrap has no active database."""

    try:
        return resolve_dataset_revision(db_path, table_name)
    except FileNotFoundError:
        return None


def require_expected_revision(expected: Optional[str], current: str) -> None:
    normalized = str(expected or "").strip()
    if normalized and normalized != current:
        raise DatasetRevisionMismatch(normalized, current)
