"""Standalone DuckDB price and bar queries used by the V4 API."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict

import duckdb


def open_db(db_path: str) -> duckdb.DuckDBPyConnection:
    path = Path(db_path)
    if not path.exists():
        raise FileNotFoundError(f"database file not found: {path}")
    return duckdb.connect(str(path), read_only=True)


def _parse_datetime(text: str) -> datetime:
    """Parse a datetime string, supporting YYYY-MM-DD HH:MM and YYYY-MM-DD HH:MM:SS."""
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M"):
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue
    raise ValueError(f"cannot parse datetime: {text}")


def query_v2_bars(
    db_path: str,
    table: str,
    instrument: str,
    start: str,
    end: str,
    tf: int = 1,
    padding: int = 19,
) -> list[Dict[str, object]]:
    """Return OHLCV bars for a time range, optionally aggregated, with padding bars on each side."""
    start_dt = _parse_datetime(start)
    end_dt = _parse_datetime(end)
    if start_dt >= end_dt:
        raise ValueError("start must be before end")

    pad_minutes = padding * tf
    query_start = start_dt - timedelta(minutes=pad_minutes)
    query_end = end_dt + timedelta(minutes=pad_minutes)

    if tf <= 1:
        sql = f"""
select ts, open, high, low, close, volume
from {table}
where instrument = ?
  and ts >= ?
  and ts < ?
order by ts
""".strip()
        with open_db(db_path) as conn:
            rows = conn.execute(sql, [instrument, query_start, query_end]).fetchall()

        return [
            {
                "time": row[0].strftime("%Y-%m-%d %H:%M"),
                "timestamp": int(row[0].replace(tzinfo=timezone.utc).timestamp()),
                "open": float(row[1]),
                "high": float(row[2]),
                "low": float(row[3]),
                "close": float(row[4]),
                "volume": int(row[5]) if row[5] is not None else 0,
            }
            for row in rows
        ]

    anchor_epoch = 946684800
    anchor_offset = 7200 if tf == 240 else 0
    effective_anchor = anchor_epoch + anchor_offset
    sql = f"""
with bars as (
  select
    date_trunc('minute', ts) as ts,
    open, high, low, close, volume
  from {table}
  where instrument = ?
    and ts >= ?
    and ts < ?
)
select
  floor((extract(epoch from ts) - {effective_anchor}) / (60 * ?)) as bucket,
  first(open order by ts) as open,
  max(high) as high,
  min(low) as low,
  last(close order by ts) as close,
  sum(coalesce(volume, 0)) as volume
from bars
group by bucket
order by bucket
""".strip()
    with open_db(db_path) as conn:
        rows = conn.execute(sql, [instrument, query_start, query_end, tf]).fetchall()

    return [
        {
            "time": datetime.fromtimestamp(
                effective_anchor + int(row[0]) * tf * 60,
                tz=timezone.utc,
            ).strftime("%Y-%m-%d %H:%M"),
            "timestamp": effective_anchor + int(row[0]) * tf * 60,
            "open": float(row[1]),
            "high": float(row[2]),
            "low": float(row[3]),
            "close": float(row[4]),
            "volume": int(row[5]) if row[5] is not None else 0,
        }
        for row in rows
    ]


def query_price(timestamp: int, db_path: str, table: str, instrument: str = "NQ") -> Dict[str, object]:
    """Return the 1-minute bar at a chart timestamp.

    V4 chart timestamps represent US/Eastern wall-clock values as UTC epoch seconds,
    so convert the epoch back to a naive wall-clock timestamp before querying DuckDB.
    """
    target_dt = datetime.fromtimestamp(int(timestamp), tz=timezone.utc).replace(tzinfo=None)
    sql = f"""
select ts, open, high, low, close, volume
from {table}
where instrument = ?
  and ts = ?
limit 1
""".strip()

    with open_db(db_path) as conn:
        row = conn.execute(sql, [instrument, target_dt]).fetchone()

    if row is None:
        raise LookupError("no data found for requested timestamp")

    return {
        "instrument": instrument,
        "time": row[0].strftime("%Y-%m-%d %H:%M"),
        "timestamp": int(row[0].replace(tzinfo=timezone.utc).timestamp()),
        "open": float(row[1]),
        "high": float(row[2]),
        "low": float(row[3]),
        "close": float(row[4]),
        "volume": int(row[5]) if row[5] is not None else 0,
        "ohlc": {
            "open": float(row[1]),
            "high": float(row[2]),
            "low": float(row[3]),
            "close": float(row[4]),
        },
    }
