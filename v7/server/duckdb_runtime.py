"""Shared, bounded DuckDB connection policy for standalone V7 services."""

from __future__ import annotations

import os
from pathlib import Path
import re
from typing import Dict


MEMORY_LIMIT_PATTERN = re.compile(r"^[1-9][0-9]*(?:KB|MB|GB)$")
MAX_THREADS = 16


def _memory_limit() -> str | None:
    value = os.environ.get("V7_DUCKDB_MEMORY_LIMIT", "").strip().upper()
    if not value:
        return None
    if MEMORY_LIMIT_PATTERN.fullmatch(value) is None:
        raise RuntimeError("V7_DUCKDB_MEMORY_LIMIT must be an integer KB, MB, or GB value")
    return value


def _threads() -> int | None:
    value = os.environ.get("V7_DUCKDB_THREADS", "").strip()
    if not value:
        return None
    try:
        threads = int(value)
    except ValueError as error:
        raise RuntimeError("V7_DUCKDB_THREADS must be an integer") from error
    if threads < 1 or threads > MAX_THREADS:
        raise RuntimeError(f"V7_DUCKDB_THREADS must be between 1 and {MAX_THREADS}")
    return threads


def _temp_directory() -> str | None:
    value = os.environ.get("V7_DUCKDB_TEMP_DIRECTORY", "").strip()
    if not value:
        return None
    raw = Path(value).expanduser()
    if not raw.is_absolute():
        raise RuntimeError("V7_DUCKDB_TEMP_DIRECTORY must be absolute")
    resolved = raw.resolve()
    if not resolved.is_dir():
        raise RuntimeError("V7_DUCKDB_TEMP_DIRECTORY must be an existing directory")
    return str(resolved)


def duckdb_connection_config(*, allow_external_access: bool = False) -> Dict[str, str]:
    """Return validated DuckDB settings without creating host directories."""

    config = {
        "enable_external_access": "true" if allow_external_access else "false",
        "autoload_known_extensions": "false",
        "autoinstall_known_extensions": "false",
    }
    memory_limit = _memory_limit()
    threads = _threads()
    temp_directory = _temp_directory()
    if memory_limit is not None:
        config["memory_limit"] = memory_limit
    if threads is not None:
        config["threads"] = str(threads)
    if temp_directory is not None:
        config["temp_directory"] = temp_directory
    return config
