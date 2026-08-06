"""SQLite owner for bounded, revisioned, user-scoped V7 state snapshots."""

from __future__ import annotations

import json
import re
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SNAPSHOT_SCHEMA = "v7.user-state-snapshot"
SNAPSHOT_VERSION = 1
MAX_ENTRIES = 4_096
MAX_KEY_BYTES = 512
MAX_VALUE_BYTES = 2_000_000
USER_ID_PATTERN = re.compile(r"^[A-Za-z0-9._-]{1,64}$")
EXACT_KEYS = frozenset(
    {
        "v7.session-browser:index",
        "v7.replay-navigation-preferences",
        "v7.workstation-settings:global",
        "v7.color-history:global",
    }
)
SESSION_RECORD_PREFIX = "v7.session-browser:record:"


class StateValidationError(ValueError):
    """Raised when an untrusted state snapshot violates the wire contract."""


@dataclass(frozen=True)
class RevisionConflict(Exception):
    """Carries the current snapshot when a stale writer loses revision CAS."""

    current: dict[str, Any]


def require_user_id(value: Any) -> str:
    if not isinstance(value, str) or USER_ID_PATTERN.fullmatch(value) is None:
        raise StateValidationError("authenticated user id is invalid")
    return value


def _allowed_key(value: str) -> bool:
    return value in EXACT_KEYS or (
        value.startswith(SESSION_RECORD_PREFIX) and len(value) > len(SESSION_RECORD_PREFIX)
    )


def normalize_entries(value: Any) -> list[dict[str, str]]:
    if not isinstance(value, list) or len(value) > MAX_ENTRIES:
        raise StateValidationError("entries must be a bounded array")
    normalized: list[dict[str, str]] = []
    keys: set[str] = set()
    for item in value:
        if not isinstance(item, dict) or set(item) != {"key", "value"}:
            raise StateValidationError("each entry must contain only key and value")
        key = item.get("key")
        entry_value = item.get("value")
        if not isinstance(key, str) or not isinstance(entry_value, str):
            raise StateValidationError("entry key and value must be strings")
        if not _allowed_key(key):
            raise StateValidationError("entry key is outside the V7 state allowlist")
        if len(key.encode("utf-8")) > MAX_KEY_BYTES:
            raise StateValidationError("entry key exceeds its byte budget")
        if len(entry_value.encode("utf-8")) > MAX_VALUE_BYTES:
            raise StateValidationError("entry value exceeds its byte budget")
        if key in keys:
            raise StateValidationError("entry keys must be unique")
        keys.add(key)
        normalized.append({"key": key, "value": entry_value})
    return sorted(normalized, key=lambda entry: entry["key"])


def require_replacement(value: Any) -> tuple[int, list[dict[str, str]]]:
    if not isinstance(value, dict) or set(value) != {
        "schema",
        "version",
        "expectedRevision",
        "entries",
    }:
        raise StateValidationError("replacement envelope is invalid")
    if value.get("schema") != SNAPSHOT_SCHEMA or value.get("version") != SNAPSHOT_VERSION:
        raise StateValidationError("replacement schema is unsupported")
    expected_revision = value.get("expectedRevision")
    if not isinstance(expected_revision, int) or isinstance(expected_revision, bool) \
            or expected_revision < 0 or expected_revision > 9_007_199_254_740_991:
        raise StateValidationError("expectedRevision must be a non-negative safe integer")
    return expected_revision, normalize_entries(value.get("entries"))


def _snapshot(user_id: str, revision: int, entries: list[dict[str, str]]) -> dict[str, Any]:
    return {
        "schema": SNAPSHOT_SCHEMA,
        "version": SNAPSHOT_VERSION,
        "userId": user_id,
        "revision": revision,
        "entries": entries,
    }


class StateStore:
    """Persist complete per-user snapshots under one monotonic CAS revision."""

    def __init__(self, database_path: str) -> None:
        path = Path(database_path).resolve()
        path.parent.mkdir(mode=0o750, parents=True, exist_ok=True)
        self.database_path = str(path)
        self._initialize()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.database_path, timeout=10)
        connection.execute("PRAGMA busy_timeout = 10000")
        return connection

    def _initialize(self) -> None:
        with self._connect() as connection:
            connection.execute("PRAGMA journal_mode = WAL")
            connection.execute("PRAGMA synchronous = FULL")
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS user_state (
                    user_id TEXT PRIMARY KEY,
                    revision INTEGER NOT NULL CHECK (revision >= 1),
                    entries_json TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )

    def health(self) -> None:
        with self._connect() as connection:
            connection.execute("SELECT 1").fetchone()

    def read(self, user_id: str) -> dict[str, Any]:
        identity = require_user_id(user_id)
        with self._connect() as connection:
            row = connection.execute(
                "SELECT revision, entries_json FROM user_state WHERE user_id = ?",
                (identity,),
            ).fetchone()
        if row is None:
            return _snapshot(identity, 0, [])
        entries = normalize_entries(json.loads(row[1]))
        return _snapshot(identity, int(row[0]), entries)

    def replace(
        self,
        user_id: str,
        expected_revision: int,
        entries: list[dict[str, str]],
    ) -> dict[str, Any]:
        identity = require_user_id(user_id)
        normalized = normalize_entries(entries)
        connection = self._connect()
        try:
            connection.execute("BEGIN IMMEDIATE")
            row = connection.execute(
                "SELECT revision, entries_json FROM user_state WHERE user_id = ?",
                (identity,),
            ).fetchone()
            current_revision = 0 if row is None else int(row[0])
            if current_revision != expected_revision:
                current_entries = [] if row is None else normalize_entries(json.loads(row[1]))
                connection.rollback()
                raise RevisionConflict(_snapshot(identity, current_revision, current_entries))
            next_revision = current_revision + 1
            encoded = json.dumps(normalized, ensure_ascii=False, separators=(",", ":"))
            updated_at = datetime.now(timezone.utc).isoformat()
            connection.execute(
                """
                INSERT INTO user_state (user_id, revision, entries_json, updated_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                    revision = excluded.revision,
                    entries_json = excluded.entries_json,
                    updated_at = excluded.updated_at
                """,
                (identity, next_revision, encoded, updated_at),
            )
            connection.commit()
            return _snapshot(identity, next_revision, normalized)
        except Exception:
            if connection.in_transaction:
                connection.rollback()
            raise
        finally:
            connection.close()
