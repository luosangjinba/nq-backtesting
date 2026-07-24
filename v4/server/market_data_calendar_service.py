"""Read-only market-date availability for Session calendar controls."""

from __future__ import annotations

from pathlib import Path
import re
from threading import Lock

import duckdb


SUPPORTED_INSTRUMENTS = ("ES", "NQ")
_TABLE_NAME = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
_CACHE = {}
_CACHE_LOCK = Lock()


def _normalize_instruments(instruments):
    requested = tuple(dict.fromkeys(str(value).strip().upper() for value in instruments))
    if not requested or any(value not in SUPPORTED_INSTRUMENTS for value in requested):
        raise ValueError("Available-date instruments must be ES and/or NQ")
    return requested


def _database_signature(path):
    stat = path.stat()
    return stat.st_mtime_ns, stat.st_size


def query_available_market_dates(db_path, table_name, instruments):
    """Return ordered New York wall-calendar dates containing at least one bar."""
    path = Path(db_path).expanduser().resolve()
    if not path.exists():
        raise ValueError(f"Market-data database does not exist: {path}")
    if not _TABLE_NAME.fullmatch(str(table_name)):
        raise ValueError("Market-data table name is invalid")
    requested = _normalize_instruments(instruments)
    signature = _database_signature(path)
    cache_key = (str(path), str(table_name), requested)
    with _CACHE_LOCK:
        cached = _CACHE.get(cache_key)
        if cached and cached[0] == signature:
            return cached[1]

    placeholders = ", ".join("?" for _ in requested)
    sql = f"""
      select
        instrument,
        strftime(ts, '%Y-%m-%d') as market_date,
        strftime(min(ts), '%Y-%m-%dT%H:%M') as first_timestamp,
        strftime(max(ts), '%Y-%m-%dT%H:%M') as latest_timestamp
      from {table_name}
      where instrument in ({placeholders})
      group by instrument, market_date
      order by instrument, market_date
    """
    dates_by_instrument = {instrument: [] for instrument in requested}
    first_by_instrument = {instrument: None for instrument in requested}
    latest_by_instrument = {instrument: None for instrument in requested}
    with duckdb.connect(str(path), read_only=True) as conn:
        for instrument, market_date, first_timestamp, latest_timestamp in conn.execute(
            sql, list(requested),
        ).fetchall():
            dates_by_instrument[instrument].append(market_date)
            if first_by_instrument[instrument] is None:
                first_by_instrument[instrument] = first_timestamp
            latest_by_instrument[instrument] = latest_timestamp

    result = tuple({
        "instrument": instrument,
        "dates": tuple(dates_by_instrument[instrument]),
        "firstTimestamp": first_by_instrument[instrument],
        "latestTimestamp": latest_by_instrument[instrument],
    } for instrument in requested)
    with _CACHE_LOCK:
        _CACHE[cache_key] = (signature, result)
    return result
